import { Component } from '@angular/core';
import {AlertController, LoadingController} from "@ionic/angular";
import {SecretapiService} from "../services/secretapi.service";
import {Secret} from "../models/secret";
import {Router} from "@angular/router";
import { sha512, sha384, sha512_256, sha512_224 } from 'js-sha512';
import { v4 as uuid } from 'uuid';

import * as CryptoJS from 'crypto-js';
import { TranslateService } from '@ngx-translate/core';
import {SecretFile} from "../models/secretfile";
import {reader} from "ionicons/icons";
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  selectedLanguage: string = 'en'; // Default language

  metaDescription:string = 'Share a onetime secret message and file with Stellar Secret. Protect your privacy and securely share confidential information.';
  metaTitle:string = 'Stellar Secret | Share a OneTime Secret Message and File';
  metaKeywords:string = 'Secret message generator, Secure message sharing, Encrypt personal information, Password protection, User data encryption, Private data sharing, Convert sensitive data';
  url: string = 'https://stellarsecret.io/';

  public addSecretModal = new Secret();

  public optionsDisplay = false;

  public burnerTimes = [1, 6, 24];

  private MAX_FILE_SIZE_MB = 15;

  secretFiles: SecretFile[] = [];

  public chosenBurnerTime = 0;
  constructor(private loadingCtrl: LoadingController,
              private alertController: AlertController,
              private router: Router,
              private secretapi: SecretapiService,
              private translate: TranslateService,
              private translationService: TranslationService) {
    this.translate.setDefaultLang(this.selectedLanguage);
  }

  public optionsToggle() {
    this.optionsDisplay = !this.optionsDisplay;
  }

  async onChangeFileUpload(event: any) {

    const file = event.target.files[0];

    let totalSizeMB = file.size / Math.pow(1024,2);

    if(totalSizeMB > this.MAX_FILE_SIZE_MB) {
      const alert = await this.alertController.create({
        header: this.translationService.allTranslations.ERROR,
        message: this.translationService.allTranslations.FILE_IS_TOO_BIG_MAX_SIZE_IS + ' ' + this.MAX_FILE_SIZE_MB + ' ' + this.translationService.allTranslations.MB_FILE_WAS_NOT_ADDED,
        buttons: [this.translationService.allTranslations.OK],
      });
      await alert.present();
      return;
    }

    if(this.secretFiles.length + 1 > 1) {
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

    reader.addEventListener("load", () => {
          // this will then display a text file
          let base64encoded = reader.result;
          let secretFile = new SecretFile();
          secretFile.name = "File 1";
          secretFile.id = null; // will be set once 'create secret' is being clicked on.
          secretFile.content = base64encoded?.toString(); // will be encrypted with the encryption-key once 'create secret' is being clicked on.
          this.secretFiles.push(secretFile);
        },
        false,
    );

    reader.readAsDataURL(file);

  }

  /**
   * Currently, we only support 1 file for upload, so index not needed atm.
   * @param index
   */
  public removeFile(index: number) {
    this.secretFiles = [];
  }

  ionViewWillEnter(){
    this.secretFiles = [];
    this.addSecretModal = new Secret();
    this.chosenBurnerTime = 0;
  }

  public setBurnerTime(burnerTime: number) {

    if(burnerTime === this.chosenBurnerTime) {
      burnerTime = 0;
    }

    this.chosenBurnerTime = burnerTime;
  }

  public async createLink() {

    if(this.addSecretModal.message.length == 0 && this.secretFiles.length == 0) {
      const alert = await this.alertController.create({
        header: this.translationService.allTranslations.ERROR,
        message: this.translationService.allTranslations.NO_MESSAGE_OR_FILE_WAS_ADDED_PLEASE_ADD_AND_TRY_AGAIN,
        buttons: [this.translationService.allTranslations.OK],
      });
      await alert.present();
      return;
    }

    const loading = await this.loadingCtrl.create({message: this.translationService.allTranslations.CREATING_SECRET});
    await loading.present();

    let secret_id = uuid();

    this.addSecretModal.id = sha512(secret_id);
    this.addSecretModal.expires_at = this.chosenBurnerTime.toString();

    // as default, we encrypt the message in DB, with the UUID id.
    let encryptionKey = secret_id;

    // PW was set, so we update encryptionKey with the User-defined-Password.
    if(this.addSecretModal.password.length > 0) {
      encryptionKey = this.addSecretModal.password;
      this.addSecretModal.password = sha512(encryptionKey).toString();
    }

    this.addSecretModal.message = CryptoJS.AES.encrypt(this.addSecretModal.message, encryptionKey).toString();

    // file upload handling.
    if(this.secretFiles.length > 0) {
      this.secretFiles[0].id = sha512(secret_id);
      this.secretFiles[0].content = CryptoJS.AES.encrypt(this.secretFiles[0].content, encryptionKey).toString();
      this.addSecretModal.files = this.secretFiles;
    }


    (await this.secretapi.create(this.addSecretModal)).subscribe(async (response) => {
        await loading.dismiss();
        await this.router.navigateByUrl("/secret/created?id=" + secret_id)
    },
    async error => {
      await loading.dismiss();
      const alert = await this.alertController.create({
        header: this.translationService.allTranslations.ERROR,
        message: this.translationService.allTranslations.SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN_IF_YOU_INCLUDED_A_FILE_THE_LIMIT_IS + ' ' + this.MAX_FILE_SIZE_MB + ' ' + this.translationService.allTranslations.MB,
        buttons: [this.translationService.allTranslations.OK],
      });
      await alert.present();
    },
        async () => {
          await loading.dismiss();
          this.addSecretModal = new Secret(); // reset
        })

  }

}
