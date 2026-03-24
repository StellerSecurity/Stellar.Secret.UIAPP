import { Component, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { SecretapiService } from '../../services/secretapi.service';

import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Secret } from '../../models/secret';
import * as CryptoJS from 'crypto-js';
import { isPlatformBrowser } from '@angular/common';
import { TranslationService } from 'src/app/services/translation.service';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
    selector: 'app-view',
    templateUrl: './view.page.html',
    styleUrls: ['./view.page.scss'],
})
export class ViewPage implements OnDestroy {
    private id: string = '';
    private unlockAnimationTimer: ReturnType<typeof setTimeout> | null = null;
    private typewriterTimer: ReturnType<typeof setInterval> | null = null;
    private redirectTimer: ReturnType<typeof setTimeout> | null = null;

    public secretModel: Secret = new Secret();

    public unlocked = false;
    public unlockingAnimation = false;
    public inputPassword = '';
    public openingLoading = false;
    public openMessage = false;
    public passwordProtected = false;

    public displayedMessage = '';
    public isTypingMessage = false;

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

    ionViewWillEnter(): void {
        this.clear();
    }

    ngOnDestroy(): void {
        this.clearTimers();
    }

    private async lightTap(): Promise<void> {
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch {
            // ignore on unsupported platforms
        }
    }

    private async mediumTap(): Promise<void> {
        try {
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch {
            // ignore on unsupported platforms
        }
    }

    private clearTimers(): void {
        if (this.unlockAnimationTimer) {
            clearTimeout(this.unlockAnimationTimer);
            this.unlockAnimationTimer = null;
        }

        if (this.typewriterTimer) {
            clearInterval(this.typewriterTimer);
            this.typewriterTimer = null;
        }

        if (this.redirectTimer) {
            clearTimeout(this.redirectTimer);
            this.redirectTimer = null;
        }
    }

    private startUnlockAnimation(): void {
        if (this.unlockAnimationTimer) {
            clearTimeout(this.unlockAnimationTimer);
        }

        this.unlocked = true;
        this.unlockingAnimation = true;

        this.unlockAnimationTimer = setTimeout(() => {
            this.unlockingAnimation = false;
            this.unlockAnimationTimer = null;
        }, 1400);
    }

    private startTypewriterMessage(fullMessage: string): void {
        if (this.typewriterTimer) {
            clearInterval(this.typewriterTimer);
            this.typewriterTimer = null;
        }

        this.displayedMessage = '';
        this.isTypingMessage = true;

        if (!fullMessage || fullMessage.length === 0) {
            this.isTypingMessage = false;
            return;
        }

        const characters = Array.from(fullMessage);
        let index = 0;

        const typingDelay = this.getTypingDelay(fullMessage);

        this.typewriterTimer = setInterval(() => {
            this.displayedMessage += characters[index];
            index += 1;

            if (index >= characters.length) {
                if (this.typewriterTimer) {
                    clearInterval(this.typewriterTimer);
                    this.typewriterTimer = null;
                }

                this.isTypingMessage = false;
            }
        }, typingDelay);
    }

    private getTypingDelay(message: string): number {
        const length = message.length;

        if (length <= 120) {
            return 18;
        }

        if (length <= 300) {
            return 12;
        }

        if (length <= 700) {
            return 8;
        }

        return 5;
    }

    private revealUnlockedSecret(decryptedMessage: string): void {
        this.secretModel.message = decryptedMessage;
        this.startUnlockAnimation();
        this.startTypewriterMessage(decryptedMessage);
    }

    base64ToFile(base64String: string, mimeType: string, fileName: string): void {
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

    public async copy(): Promise<void> {
        const copyText = this.secretModel.message || '';

        if (isPlatformBrowser(this.platformId) && navigator?.clipboard) {
            await navigator.clipboard.writeText(copyText);
            await this.lightTap();

            const toast = await this.toastController.create({
                message: this.translationService.allTranslations.THE_MESSAGE_HAS_BEEN_COPIED,
                duration: 2500,
                position: 'top',
            });

            await toast.present();
        }
    }

    public async loadSecret(): Promise<void> {
        if (this.openingLoading) {
            return;
        }

        await this.lightTap();
        this.openingLoading = true;
        this.openMessageBox();
    }

    public openMessageBox(): void {
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
                this.secretModel = response as Secret;
                this.passwordProtected = !!(this.secretModel as any).has_password;

                if (!this.passwordProtected) {
                    const decryptedMessage = CryptoJS.AES.decrypt(
                        this.secretModel.message,
                        this.id
                    ).toString(CryptoJS.enc.Utf8);

                    if (this.secretModel.files && this.secretModel.files.length > 0) {
                        this.secretModel.files[0].content = CryptoJS.AES.decrypt(
                            this.secretModel.files[0].content,
                            this.id
                        ).toString(CryptoJS.enc.Utf8);
                    }

                    this.revealUnlockedSecret(decryptedMessage);
                    await this.mediumTap();
                }

                if (this.redirectTimer) {
                    clearTimeout(this.redirectTimer);
                }

                this.redirectTimer = setTimeout(async () => {
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

    public async downloadAttachedFile(): Promise<void> {
        if (!this.secretModel.files || this.secretModel.files.length === 0) {
            alert(this.translationService.allTranslations.SOMETHING_WENT_WRONG);
            return;
        }

        const confirmAlert = await this.alertController.create({
            header: 'Download attached file?',
            message: 'Downloading will store a local copy of this file on this device.',
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel',
                },
                {
                    text: 'Download',
                    role: 'confirm',
                },
            ],
        });

        await confirmAlert.present();

        const result = await confirmAlert.onDidDismiss();

        if (result.role !== 'confirm') {
            return;
        }

        await this.mediumTap();

        const loading = await this.loadingCtrl.create();
        await loading.present();

        try {
            const fileContent = this.secretModel.files[0].content || '';
            const mime = fileContent.split(';');
            mime[0] = mime[0].replace('data:', '');

            const randomNumber = Math.floor(Math.random() * (999999999 - 9999) + 9999);
            this.base64ToFile(fileContent, mime[0], 'File-' + randomNumber);
        } finally {
            await loading.dismiss();
        }
    }

    public async unlockByPassword(): Promise<void> {
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

        if (this.secretModel.files && this.secretModel.files.length > 0) {
            this.secretModel.files[0].content = CryptoJS.AES.decrypt(
                this.secretModel.files[0].content,
                inputPwd
            ).toString(CryptoJS.enc.Utf8);
        }

        this.revealUnlockedSecret(decryptedMessage);
        await this.mediumTap();
    }

    public async reply(): Promise<void> {
        await this.lightTap();
        this.clear();
        await this.router.navigate(['/']);
    }

    private clear(): void {
        this.clearTimers();

        this.openingLoading = false;
        this.secretModel = new Secret();
        this.unlocked = false;
        this.unlockingAnimation = false;
        this.openMessage = false;
        this.inputPassword = '';
        this.passwordProtected = false;
        this.displayedMessage = '';
        this.isTypingMessage = false;
    }
}