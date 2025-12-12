import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { SecretapiService } from '../../services/secretapi.service';

import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Secret } from '../../models/secret';
import * as CryptoJS from 'crypto-js';
import { isPlatformBrowser } from '@angular/common';
import { TranslationService } from 'src/app/services/translation.service';

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

    public loadSecret() {
        if (this.openingLoading) {
            return;
        }
        this.openingLoading = true;
        this.openMessageBox();
    }

    public openMessageBox() {
        this.openingLoading = true;

        this.secretapi.view(this.id).subscribe(
            async (response) => {
                this.openMessage = true;

                if (response.response_code !== 200) {
                    this.openingLoading = false;

                    const alert = await this.alertController.create({
                        header: this.translationService.allTranslations.SECRET_ERROR,
                        message:
                        this.translationService.allTranslations
                            .THE_SECRET_LINK_DOES_NOT_EXIST_OR_HAS_ALREADY_BEEN_VIEWED,
                        buttons: [this.translationService.allTranslations.OK],
                    });

                    await alert.present();

                    await this.router.navigateByUrl('/');
                    return;
                }

                this.openingLoading = false;

                // Response contains the encrypted secret model (with has_password flag)
                this.secretModel = response as Secret;

                // Determine if the secret is password protected
                this.passwordProtected = !!(this.secretModel as any).has_password;

                // No password set: decrypt directly with the raw secret link ID
                if (!this.passwordProtected) {
                    this.secretModel.message = CryptoJS.AES.decrypt(
                        this.secretModel.message,
                        this.id
                    ).toString(CryptoJS.enc.Utf8);

                    if (this.secretModel.files && this.secretModel.files.length > 0) {
                        this.secretModel.files[0].content = CryptoJS.AES.decrypt(
                            this.secretModel.files[0].content,
                            this.id
                        ).toString(CryptoJS.enc.Utf8);
                    }

                    this.unlocked = true;
                }

                // Auto-clear and redirect after 5 minutes
                setTimeout(async () => {
                    this.clear();
                    await this.router.navigateByUrl('/');
                }, 300000);
            },
            async (error) => {
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
        const inputPwd = this.inputPassword || '';

        const decryptedMessage = CryptoJS.AES.decrypt(
            this.secretModel.message,
            inputPwd
        ).toString(CryptoJS.enc.Utf8);

        if (decryptedMessage.length === 0) {
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
            this.secretModel.files[0].content = CryptoJS.AES.decrypt(
                this.secretModel.files[0].content,
                inputPwd
            ).toString(CryptoJS.enc.Utf8);
        }

        this.unlocked = true;
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
