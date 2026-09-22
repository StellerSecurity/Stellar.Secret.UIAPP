import { Component } from '@angular/core';
import { AlertController, LoadingController, Platform } from '@ionic/angular';
import { SecretapiService } from '../services/secretapi.service';
import { Secret } from '../models/secret';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { sha512 } from 'js-sha512';
import { v4 as uuid } from 'uuid';

import * as CryptoJS from 'crypto-js';
import { TranslateService } from '@ngx-translate/core';
import { SecretFile } from '../models/secretfile';
import { TranslationService } from '../services/translation.service';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

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

    // Lock before haptics or any other asynchronous work.
    this.creating = true;

    try {
      const message = (this.addSecretModal.message || '').toString();
      const hasMessage = message.trim().length > 0;
      const files = this.secretFiles.map(file => ({ ...file }));
      const userPassword = (this.addSecretModal.password || '').toString();
      const expiresAt = this.chosenBurnerTime.toString();

      await this.lightTap();

      if (!hasMessage && files.length === 0) {
        const alert = await this.alertController.create({
          header: this.translationService.allTranslations.ERROR,
          message: this.translationService.allTranslations
              .NO_MESSAGE_OR_FILE_WAS_ADDED_PLEASE_ADD_AND_TRY_AGAIN,
          buttons: [this.translationService.allTranslations.OK],
        });
        await alert.present();
        return;
      }

      const secretId = uuid();
      const encryptionKey = userPassword || secretId;
      // Keep the editable draft intact so a failed request can be retried safely.
      const payload: Secret & { encryption_version: string } = {
        id: sha512(secretId),
        expires_at: expiresAt,
        encryption_version: this.ENCRYPTION_VERSION,
        has_password: userPassword.length > 0,
        message: hasMessage ? CryptoJS.AES.encrypt(message, encryptionKey).toString() : '',
        files: files.map(file => ({
          ...file,
          id: sha512(secretId),
          content: CryptoJS.AES.encrypt(file.content || '', encryptionKey).toString(),
        })),
      };

      await firstValueFrom(this.secretapi.create(payload));
      await this.mediumTap();
      const navigated = await this.router.navigate(['/secret/created'], { state: { id: secretId } });
      if (navigated) {
        this.addSecretModal = new Secret();
        this.secretFiles = [];
        this.chosenBurnerTime = 0;
      }
    } catch {
      const alert = await this.alertController.create({
        header: this.translationService.allTranslations.ERROR,
        message:
            this.translationService.allTranslations
                .SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN_IF_YOU_INCLUDED_A_FILE_THE_LIMIT_IS +
            ' ' + this.MAX_FILE_SIZE_MB + ' ' + this.translationService.allTranslations.MB,
        buttons: [this.translationService.allTranslations.OK],
      });
      await alert.present();
    } finally {
      // Remain locked through the request, haptics and navigation.
      this.creating = false;
    }
  }
}
