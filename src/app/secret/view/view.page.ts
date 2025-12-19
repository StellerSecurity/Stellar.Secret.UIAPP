import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { SecretapiService } from '../../services/secretapi.service';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Secret } from '../../models/secret';
import * as CryptoJS from 'crypto-js';
import { isPlatformBrowser } from '@angular/common';
import { TranslationService } from 'src/app/services/translation.service';

type EnvelopeV2 = {
    v: 'v2';
    alg: 'A256GCM';
    kdf: 'PBKDF2';
    hash: 'SHA-256';
    iter: number;
    salt_b64: string;
    iv_b64: string;
    ct_b64: string;
};

@Component({
    selector: 'app-view',
    templateUrl: './view.page.html',
    styleUrls: ['./view.page.scss'],
})
export class ViewPage {
    private id: string = '';

    public secretModel: Secret = new Secret();

    public unlocked = false;
    public inputPassword = '';
    public openingLoading = false;
    public openMessage = false;
    public passwordProtected = false;

    public url: string = '';
    metaDescription: string = '';
    metaTitle: string = 'Secret Message - Stellar Secret';
    metaKeywords: string = '';

    private readonly textEnc = new TextEncoder();
    private readonly textDec = new TextDecoder();

    constructor(
        @Inject(PLATFORM_ID) private platformId: Object,
        private router: Router,
        private toastController: ToastController,
        private alertController: AlertController,
        private loadingCtrl: LoadingController,
        private activatedRoute: ActivatedRoute,
        private secretapi: SecretapiService,
        private translationService: TranslationService
    ) {
        this.activatedRoute.params.subscribe((params: Params) => {
            this.id = params['id'];
        });
    }

    ionViewWillEnter() {
        this.clear();
    }

    // ---------------------- File helper ----------------------

    base64ToFile(base64String: string, mimeType: string, fileName: string) {
        const base64Data = base64String.replace(/^data:.+;base64,/, '');
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();

        URL.revokeObjectURL(url);
    }

    // ---------------------- Clipboard ----------------------

    public async copy() {
        const copyText = this.secretModel.message || '';

        if (isPlatformBrowser(this.platformId)) {
            await navigator.clipboard.writeText(copyText);

            const toast = await this.toastController.create({
                message: this.translationService.allTranslations.THE_MESSAGE_HAS_BEEN_COPIED,
                duration: 3000,
                position: 'top',
            });

            await toast.present();
        }
    }

    // ---------------------- Crypto (v2 WebCrypto + legacy v1 CryptoJS) ----------------------

    private b64decode(b64: string): Uint8Array {
        const bin = atob(b64);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }

    private isEnvelopeV2(value: string): boolean {
        if (!value) return false;
        if (value.length < 10) return false;
        if (value[0] !== '{') return false;

        try {
            const obj = JSON.parse(value) as Partial<EnvelopeV2>;
            return obj?.v === 'v2' && obj?.alg === 'A256GCM' && !!obj?.salt_b64 && !!obj?.iv_b64 && !!obj?.ct_b64;
        } catch {
            return false;
        }
    }

    private async deriveAesGcmKey(passwordOrUuid: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
        const baseKey = await crypto.subtle.importKey(
            'raw',
            this.textEnc.encode(passwordOrUuid),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                hash: 'SHA-256',
                salt,
                iterations,
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    private async decryptEnvelopeV2(envelopeJson: string, passwordOrUuid: string): Promise<string> {
        if (!crypto?.subtle) {
            throw new Error('WebCrypto not available');
        }

        const env = JSON.parse(envelopeJson) as EnvelopeV2;

        const salt = this.b64decode(env.salt_b64);
        const iv = this.b64decode(env.iv_b64);
        const ct = this.b64decode(env.ct_b64);

        const key = await this.deriveAesGcmKey(passwordOrUuid, salt, env.iter);

        const ptBuf = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv, tagLength: 128 },
            key,
            ct
        );

        return this.textDec.decode(ptBuf);
    }

    private decryptLegacyV1(ciphertext: string, passwordOrUuid: string): string {
        return CryptoJS.AES.decrypt(ciphertext, passwordOrUuid).toString(CryptoJS.enc.Utf8);
    }

    private async decryptAuto(ciphertext: string, passwordOrUuid: string): Promise<string> {
        if (!ciphertext) return '';

        // New v2 format (JSON envelope)
        if (this.isEnvelopeV2(ciphertext)) {
            return this.decryptEnvelopeV2(ciphertext, passwordOrUuid);
        }

        // Legacy v1 (CryptoJS passphrase ciphertext)
        return this.decryptLegacyV1(ciphertext, passwordOrUuid);
    }

    // ---------------------- Loading ----------------------

    public loadSecret() {
        if (this.openingLoading) return;
        this.openingLoading = true;
        this.openMessageBox();
    }

    public openMessageBox() {
        this.openingLoading = true;

        this.secretapi.view(this.id).subscribe(
            async (response) => {
                this.openMessage = true;

                if ((response as any).response_code !== 200) {
                    this.openingLoading = false;

                    const alert = await this.alertController.create({
                        header: this.translationService.allTranslations.SECRET_ERROR,
                        message: this.translationService.allTranslations.THE_SECRET_LINK_DOES_NOT_EXIST_OR_HAS_ALREADY_BEEN_VIEWED,
                        buttons: [this.translationService.allTranslations.OK],
                    });

                    await alert.present();
                    await this.router.navigateByUrl('/');
                    return;
                }

                this.openingLoading = false;

                this.secretModel = response as Secret;
                this.passwordProtected = !!(this.secretModel as any).has_password;

                // No password: decrypt immediately using id (same logic as before)
                if (!this.passwordProtected) {
                    try {
                        this.secretModel.message = await this.decryptAuto(this.secretModel.message || '', this.id);

                        if (this.secretModel.files && this.secretModel.files.length > 0) {
                            this.secretModel.files[0].content = await this.decryptAuto(
                                this.secretModel.files[0].content || '',
                                this.id
                            );
                        }

                        this.unlocked = true;
                    } catch {
                        const alert = await this.alertController.create({
                            header: this.translationService.allTranslations.SECRET_ERROR,
                            message: this.translationService.allTranslations.SOMETHING_WENT_WRONG,
                            buttons: [this.translationService.allTranslations.OK],
                        });

                        await alert.present();
                        await this.router.navigateByUrl('/');
                        return;
                    }
                }

                // Auto-clear after 5 minutes
                setTimeout(async () => {
                    this.clear();
                    await this.router.navigateByUrl('/');
                }, 300000);
            },
            async () => {
                this.openingLoading = false;

                const alert = await this.alertController.create({
                    header: this.translationService.allTranslations.SECRET_ERROR,
                    message: this.translationService.allTranslations.SOMETHING_WENT_WRONG,
                    buttons: [this.translationService.allTranslations.OK],
                });

                await alert.present();
            }
        );
    }

    public async downloadAttachedFile() {
        if (this.secretModel.files && this.secretModel.files.length > 0) {
            const loading = await this.loadingCtrl.create();
            await loading.present();

            const fileContent = this.secretModel.files[0].content || '';
            const mime = fileContent.split(';');
            mime[0] = mime[0].replace('data:', '');

            const randomNumber = Math.floor(Math.random() * (999999999 - 9999) + 9999);
            this.base64ToFile(fileContent, mime[0], 'File-' + randomNumber);

            await loading.dismiss();
        } else {
            alert(this.translationService.allTranslations.SOMETHING_WENT_WRONG);
        }
    }

    public async unlockByPassword() {
        const inputPwd = (this.inputPassword || '').toString();

        try {
            const decryptedMessage = await this.decryptAuto(this.secretModel.message || '', inputPwd);

            // For v1 CryptoJS, wrong password returns empty string. For v2 AES-GCM, it throws.
            if (!decryptedMessage || decryptedMessage.length === 0) {
                const alert = await this.alertController.create({
                    header: this.translationService.allTranslations.SECRET_ERROR,
                    message: this.translationService.allTranslations.THE_PASSWORD_IS_NOT_CORRECT_TRY_AGAIN,
                    buttons: [this.translationService.allTranslations.OK],
                });

                await alert.present();
                return;
            }

            this.secretModel.message = decryptedMessage;

            if (this.secretModel.files && this.secretModel.files.length > 0) {
                const decryptedFile = await this.decryptAuto(this.secretModel.files[0].content || '', inputPwd);
                this.secretModel.files[0].content = decryptedFile;
            }

            this.unlocked = true;
        } catch {
            const alert = await this.alertController.create({
                header: this.translationService.allTranslations.SECRET_ERROR,
                message: this.translationService.allTranslations.THE_PASSWORD_IS_NOT_CORRECT_TRY_AGAIN,
                buttons: [this.translationService.allTranslations.OK],
            });

            await alert.present();
        }
    }

    public reply() {
        this.clear();
        this.router.navigate(['/']).then(() => {});
    }

    private clear() {
        this.openingLoading = false;
        this.secretModel = new Secret();
        this.unlocked = false;
        this.openMessage = false;
        this.inputPassword = '';
        this.passwordProtected = false;
    }
}
