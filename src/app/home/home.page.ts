// home.page.ts
import { Component } from '@angular/core';
import { AlertController, LoadingController, Platform } from '@ionic/angular';
import { SecretapiService } from '../services/secretapi.service';
import { Secret } from '../models/secret';
import { Router } from '@angular/router';
import { sha512 } from 'js-sha512';
import { v4 as uuid } from 'uuid';

import * as CryptoJS from 'crypto-js';
import { TranslateService } from '@ngx-translate/core';
import { SecretFile } from '../models/secretfile';
import { TranslationService } from '../services/translation.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  selectedLanguage: string = 'en';

  metaDescription: string =
      'Share a one-time secret message and file with Stellar Secret. Protect your privacy and securely share confidential information.';
  metaTitle: string = 'Stellar Secret | Share a One-Time Secret Message and File';
  metaKeywords: string =
      'Secret message generator, Secure message sharing, Encrypt personal information, Password protection, User data encryption, Private data sharing, Convert sensitive data';
  url: string = 'https://stellarsecret.io/';

  public addSecretModal = new Secret();
  public creating = false;
  public optionsDisplay = false;
  public burnerTimes = [1, 6, 24];

  private readonly MAX_FILE_SIZE_MB = 30;
  private readonly ENCRYPTION_VERSION = 'v1';

  secretFiles: SecretFile[] = [];
  public chosenBurnerTime = 0;

  // Used to hide "Attach file" UI on iOS
  public isIOS = false;

  constructor(
      private loadingCtrl: LoadingController,
      private alertController: AlertController,
      private router: Router,
      private secretapi: SecretapiService,
      private translate: TranslateService,
      private translationService: TranslationService,
      private platform: Platform
  ) {
    this.translate.setDefaultLang(this.selectedLanguage);

    // Hide on iOS (native + iOS Safari/PWA)
    this.isIOS =
        Capacitor.getPlatform() === 'ios' ||
        this.platform.is('ios') ||
        this.platform.is('iphone') ||
        this.platform.is('ipad');
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

  public async optionsToggle(): Promise<void> {
    await this.lightTap();
    this.optionsDisplay = !this.optionsDisplay;
  }

  async onChangeFileUpload(event: any): Promise<void> {
    const file: File | undefined = event?.target?.files?.[0];

    if (!file) {
      return;
    }

    await this.lightTap();

    const totalSizeMB = file.size / Math.pow(1024, 2);

    if (totalSizeMB > this.MAX_FILE_SIZE_MB) {
      const alert = await this.alertController.create({
        header: this.translationService.allTranslations.ERROR,
        message:
            this.translationService.allTranslations.FILE_IS_TOO_BIG_MAX_SIZE_IS +
            ' ' +
            this.MAX_FILE_SIZE_MB +
            ' ' +
            this.translationService.allTranslations.MB_FILE_WAS_NOT_ADDED,
        buttons: [this.translationService.allTranslations.OK],
      });
      await alert.present();
      return;
    }

    if (this.secretFiles.length + 1 > 1) {
      const alert = await this.alertController.create({
        header: this.translationService.allTranslations.ERROR_MAX_1_FILE_PER_SECRET,
        message: this.translationService.allTranslations.A_SECRET_CAN_ONLY_INCLUDE_ONE_FILE,
        buttons: [this.translationService.allTranslations.OK],
      });
      await alert.present();
      return;
    }

    const reader = new FileReader();
    this.secretFiles = [];

    reader.addEventListener(
        'load',
        () => {
          const base64encoded = reader.result;
          const secretFile = new SecretFile();
          secretFile.name = file.name || 'File 1';
          secretFile.id = null;
          secretFile.content = base64encoded?.toString() || '';
          this.secretFiles.push(secretFile);
        },
        false
    );

    reader.readAsDataURL(file);
  }

  public async removeFile(index: number): Promise<void> {
    await this.lightTap();
    this.secretFiles = [];
  }

  ionViewWillEnter(): void {
    this.secretFiles = [];
    this.addSecretModal = new Secret();
    this.chosenBurnerTime = 0;
  }

  public async setBurnerTime(burnerTime: number): Promise<void> {
    await this.lightTap();

    if (burnerTime === this.chosenBurnerTime) {
      burnerTime = 0;
    }

    this.chosenBurnerTime = burnerTime;
  }

  public async createLink(): Promise<void> {
    if (this.creating) {
      return;
    }

    await this.lightTap();

    const message = (this.addSecretModal.message || '').toString();
    const hasMessage = message.trim().length > 0;
    const hasFile = this.secretFiles.length > 0;

    if (!hasMessage && !hasFile) {
      const alert = await this.alertController.create({
        header: this.translationService.allTranslations.ERROR,
        message:
        this.translationService.allTranslations
            .NO_MESSAGE_OR_FILE_WAS_ADDED_PLEASE_ADD_AND_TRY_AGAIN,
        buttons: [this.translationService.allTranslations.OK],
      });
      await alert.present();
      return;
    }

    this.creating = true;

    const secret_id = uuid();

    this.addSecretModal.id = sha512(secret_id);
    this.addSecretModal.expires_at = this.chosenBurnerTime.toString();

    (this.addSecretModal as any).encryption_version = this.ENCRYPTION_VERSION;

    let encryptionKey = secret_id;
    const userPassword = (this.addSecretModal.password || '').toString();
    const hasPassword = userPassword.length > 0;

    (this.addSecretModal as any).has_password = hasPassword;

    if (hasPassword) {
      encryptionKey = userPassword;
    }

    (this.addSecretModal as any).password = undefined;

    if (hasMessage) {
      this.addSecretModal.message = CryptoJS.AES.encrypt(message, encryptionKey).toString();
    } else {
      this.addSecretModal.message = '';
    }

    if (hasFile) {
      const file = this.secretFiles[0];
      file.id = sha512(secret_id);
      file.content = CryptoJS.AES.encrypt(file.content || '', encryptionKey).toString();
      this.addSecretModal.files = [file];
    } else {
      this.addSecretModal.files = [];
    }

    try {
      (await this.secretapi.create(this.addSecretModal)).subscribe(
          async () => {
            this.creating = false;
            await this.mediumTap();

            // IMPORTANT: no more ?id=... in URL, use router state instead
            await this.router.navigate(['/secret/created'], { state: { id: secret_id } });
          },
          async () => {
            this.creating = false;
            const alert = await this.alertController.create({
              header: this.translationService.allTranslations.ERROR,
              message:
                  this.translationService.allTranslations
                      .SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN_IF_YOU_INCLUDED_A_FILE_THE_LIMIT_IS +
                  ' ' +
                  this.MAX_FILE_SIZE_MB +
                  ' ' +
                  this.translationService.allTranslations.MB,
              buttons: [this.translationService.allTranslations.OK],
            });

            await alert.present();
          },
          async () => {
            this.creating = false;
            this.addSecretModal = new Secret();
            this.secretFiles = [];
            this.chosenBurnerTime = 0;
          }
      );
    } catch {
      this.creating = false;
      const alert = await this.alertController.create({
        header: this.translationService.allTranslations.ERROR,
        message:
            this.translationService.allTranslations
                .SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN_IF_YOU_INCLUDED_A_FILE_THE_LIMIT_IS +
            ' ' +
            this.MAX_FILE_SIZE_MB +
            ' ' +
            this.translationService.allTranslations.MB,
        buttons: [this.translationService.allTranslations.OK],
      });
      await alert.present();
    }
  }
}