import AppServerModule from './src/main.server';
import express from 'express';
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from "@angular/ssr";
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function hasUnsafeEmptyPathOutlet(requestUrl: string): boolean {
    const pathname = requestUrl.split(/[?#]/, 1)[0];

    try {
        return /:\/\(|\(\/\(|\/\/\/\(/.test(decodeURIComponent(pathname));
    } catch {
        // A malformed encoded path must not be forwarded to Angular's router.
        return true;
    }
}

function rejectUnsafeRouterOutletRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
): void {
    if (hasUnsafeEmptyPathOutlet(req.originalUrl)) {
        res.status(400).send('Bad Request');
        return;
    }

    next();
}

export function app(): express.Express {
    const server = express();
    const serverDistFolder = dirname(fileURLToPath(import.meta.url));
    const browserDistFolder = resolve(serverDistFolder, '../browser');
    const indexHtml = join(serverDistFolder, 'index.server.html');

    const commonEngine = new CommonEngine();

    server.set('view engine', 'html');
    server.set('views', browserDistFolder);

    server.use(rejectUnsafeRouterOutletRequest);

    server.get(
        '*.*',
        express.static(browserDistFolder, {
            maxAge: '1y',
            index: 'index.html',
        })
    );

    server.get('*', (req, res, next) => {
        const { protocol, originalUrl, baseUrl, headers } = req;

        commonEngine.render({
            bootstrap: AppServerModule,
            documentFilePath: indexHtml,
            url: `${protocol}://${headers.host}${originalUrl}`,
            publicPath: browserDistFolder,
            providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
        })
        .then((html: any) => res.send(html))
        .catch((err: any) => next(err));
    });

    return server;
}

function run(): void {
    const port = process.env['PORT'] || 4000;

    const server = app();
    server.listen(port, () => {
        console.log(`Node Express listening on http://localhost:${port}`);
    })
}

run();
