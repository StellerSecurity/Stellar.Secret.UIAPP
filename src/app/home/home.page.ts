import { Component } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { SecretapiService } from '../services/secretapi.service';
import { Secret } from '../models/secret';
import { Router } from '@angular/router';
import { sha512 } from 'js-sha512';
import { v4 as uuid } from 'uuid';
import { TranslateService } from '@ngx-translate/core';
import { SecretFile } from '../models/secretfile';
import { TranslationService } from '../services/translation.service';

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


  // Bump version since format changes (envelope JSON).
  private readonly ENCRYPTION_VERSION: Secret['encryption_version'] = 'v2';

  // PBKDF2 tuning. 600k is a reasonable baseline on modern devices.
  // If you see performance issues on low-end phones, tune down but do not go back to CryptoJS passphrase mode.
  private readonly PBKDF2_ITERATIONS = 600_000;

  secretFiles: SecretFile[] = [];
  public chosenBurnerTime = 0;

  private readonly textEnc = new TextEncoder();

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
    if (!file) return;

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

  public removeFile(index: number) {
    this.secretFiles = [];
  }

  ionViewWillEnter() {
    this.secretFiles = [];
    this.addSecretModal = new Secret();
    this.chosenBurnerTime = 0;
  }

  public setBurnerTime(burnerTime: number) {
    if (burnerTime === this.chosenBurnerTime) burnerTime = 0;
    this.chosenBurnerTime = burnerTime;
  }

  // ---------- Crypto helpers (WebCrypto AES-256-GCM + PBKDF2-SHA256) ----------

  private b64encode(bytes: Uint8Array): string {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  private b64decode(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
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

  private async encryptEnvelopeV2(plaintext: string, passwordOrUuid: string): Promise<string> {
    if (!crypto?.subtle) {
      throw new Error('WebCrypto not available');
    }

    const iter = this.PBKDF2_ITERATIONS;
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for GCM

    const key = await this.deriveAesGcmKey(passwordOrUuid, salt, iter);

    const ctBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        key,
        this.textEnc.encode(plaintext)
    );

    const env: EnvelopeV2 = {
      v: 'v2',
      alg: 'A256GCM',
      kdf: 'PBKDF2',
      hash: 'SHA-256',
      iter,
      salt_b64: this.b64encode(salt),
      iv_b64: this.b64encode(iv),
      ct_b64: this.b64encode(new Uint8Array(ctBuf)),
    };

    return JSON.stringify(env);
  }

  // ------------------------------ Main flow ------------------------------

  public async createLink() {
    if (this.creating) return;

    const message = (this.addSecretModal.message || '').toString();
    const hasMessage = message.trim().length > 0;
    const hasFile = this.secretFiles.length > 0; // kept, but not the focus

    if (!hasMessage && !hasFile) {
      const alert = await this.alertController.create({
        header: this.translationService.allTranslations.ERROR,
        message: this.translationService.allTranslations.NO_MESSAGE_OR_FILE_WAS_ADDED_PLEASE_ADD_AND_TRY_AGAIN,
        buttons: [this.translationService.allTranslations.OK],
      });
      await alert.present();
      return;
    }

    this.creating = true;

    const secret_id = uuid();
    const hashedId = sha512(secret_id);

    const userPassword = (this.addSecretModal.password || '').toString().trim();
    const hasPassword = userPassword.length > 0;
    const passwordOrUuid = hasPassword ? userPassword : secret_id;

    try {
      const encryptedMessage = hasMessage
          ? await this.encryptEnvelopeV2(message, passwordOrUuid)
          : '';

      // Build a payload explicitly to avoid accidentally sending password or other junk.
      const payload: Secret = {
        id: hashedId,
        message: encryptedMessage,
        expires_at: this.chosenBurnerTime.toString(),
        has_password: hasPassword,
        encryption_version: this.ENCRYPTION_VERSION,
        files: [],
        password: undefined, // still present in type, but won't matter if your serializer omits undefined
      };

      if (hasFile) {
        const file = this.secretFiles[0];
        file.id = hashedId;
        file.content = await this.encryptEnvelopeV2(file.content || '', passwordOrUuid);
        payload.files = [file];
      }

      (await this.secretapi.create(payload)).subscribe(
          async () => {
            this.creating = false;
            await this.router.navigate(['/secret/created'], { state: { id: secret_id } });
          },
          async () => {
            this.creating = false;
            const alert = await this.alertController.create({
              header: this.translationService.allTranslations.ERROR,
              message:
                  this.translationService.allTranslations.SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN_IF_YOU_INCLUDED_A_FILE_THE_LIMIT_IS +
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
            this.translationService.allTranslations.SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN_IF_YOU_INCLUDED_A_FILE_THE_LIMIT_IS +
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
