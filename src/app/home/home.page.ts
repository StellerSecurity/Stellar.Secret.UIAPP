import { Component } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { SecretapiService } from '../services/secretapi.service';
import { Secret } from '../models/secret';
import { Router } from '@angular/router';
import { sha512 } from 'js-sha512';
import { v4 as uuid } from 'uuid';

import * as CryptoJS from 'crypto-js';
import { TranslateService } from '@ngx-translate/core';
import { SecretFile } from '../models/secretfile';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  selectedLanguage: string = 'en'; // Default language

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

  constructor(
      private loadingCtrl: LoadingController,
      private alertController: AlertController,
      private router: Router,
      private secretapi: SecretapiService,
      private translate: TranslateService,
      private translationService: TranslationService
  ) {
    this.translate.setDefaultLang(this.selectedLanguage);
  }

  public optionsToggle() {
    this.optionsDisplay = !this.optionsDisplay;
  }

  async onChangeFileUpload(event: any) {
    const file: File | undefined = event?.target?.files?.[0];

    if (!file) {
      return;
    }

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

    // Only 1 file per secret
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

    // Reset any previous file when a new one is chosen
    this.secretFiles = [];

    reader.addEventListener(
        'load',
        () => {
          const base64encoded = reader.result;
          const secretFile = new SecretFile();
          secretFile.name = file.name || 'File 1';
          secretFile.id = null; // will be set once 'create secret' is being clicked on.
          secretFile.content = base64encoded?.toString() || ''; // will be encrypted with the encryption-key once 'create secret' is being clicked on.
          this.secretFiles.push(secretFile);
        },
        false
    );

    reader.readAsDataURL(file);
  }

  /**
   * Currently, we only support 1 file for upload, so index not needed atm.
   */
  public removeFile(index: number) {
    this.secretFiles = [];
  }

  ionViewWillEnter() {
    this.secretFiles = [];
    this.addSecretModal = new Secret();
    this.chosenBurnerTime = 0;
  }

  public setBurnerTime(burnerTime: number) {
    if (burnerTime === this.chosenBurnerTime) {
      burnerTime = 0;
    }

    this.chosenBurnerTime = burnerTime;
  }

  public async createLink() {
    if (this.creating) {
      return;
    }

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

    // id is the hashed UUID (server never sees the raw secret_id)
    this.addSecretModal.id = sha512(secret_id);
    this.addSecretModal.expires_at = this.chosenBurnerTime.toString();

    // Set encryption version for forward compatibility.
    (this.addSecretModal as any).encryption_version = this.ENCRYPTION_VERSION;

    // Default encryption key is the UUID
    let encryptionKey = secret_id;

    // User-defined password (never leaves the client in any form)
    const userPassword = (this.addSecretModal.password || '').toString();

    // Set has_password flag for the backend, but do NOT send the password or any hash of it
    const hasPassword = userPassword.length > 0;
    (this.addSecretModal as any).has_password = hasPassword;

    if (hasPassword) {
      // If password is set, we use it as the encryption key
      encryptionKey = userPassword;
    }

    // Ensure we do NOT send password to the backend at all
    (this.addSecretModal as any).password = undefined;

    // Encrypt message only if present
    if (hasMessage) {
      this.addSecretModal.message = CryptoJS.AES.encrypt(
          message,
          encryptionKey
      ).toString();
    } else {
      this.addSecretModal.message = '';
    }

    // File upload handling: encrypt file content with the same key
    if (hasFile) {
      const file = this.secretFiles[0];
      file.id = sha512(secret_id);
      file.content = CryptoJS.AES.encrypt(
          file.content || '',
          encryptionKey
      ).toString();
      this.addSecretModal.files = [file];
    } else {
      this.addSecretModal.files = [];
    }

    try {
      (await this.secretapi.create(this.addSecretModal)).subscribe(
          async (response) => {
            this.creating = false;

            // IMPORTANT: no more ?id=... in URL, use router state instead
            await this.router.navigate(
                ['/secret/created'],
                { state: { id: secret_id } }
            );
          },
          async (error) => {
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
            this.addSecretModal = new Secret(); // reset
            this.secretFiles = [];
            this.chosenBurnerTime = 0;
          }
      );
    } catch (e) {
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
