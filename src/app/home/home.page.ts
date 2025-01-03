import { Component } from '@angular/core';
import {AlertController, LoadingController} from "@ionic/angular";
import {SecretapiService} from "../services/secretapi.service";
import {Secret} from "../models/secret";
import {Router} from "@angular/router";
import { sha512, sha384, sha512_256, sha512_224 } from 'js-sha512';
import { v4 as uuid } from 'uuid';

import * as CryptoJS from 'crypto-js';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  selectedLanguage: string = 'en'; // Default language

  metaDescription:string = 'Share a onetime secret message with Stellar Secret. Protect your privacy and securely share confidential information.';
  metaTitle:string = 'Stellar Secret | Share a OneTime Secret Message';
  metaKeywords:string = 'Secret message generator, Secure message sharing, Encrypt personal information, Password protection, User data encryption, Private data sharing, Convert sensitive data';
  url: string = 'https://stellarsecret.io/';

  public addSecretModal = new Secret();

  public optionsDisplay = false;

  public burnerTimes = [1, 6, 24];

  public chosenBurnerTime = 0;
  constructor(private loadingCtrl: LoadingController,
              private alertController: AlertController,
              private router: Router,
              private secretapi: SecretapiService,
              private translate: TranslateService) {
    this.translate.setDefaultLang(this.selectedLanguage);
  }

  public optionsToggle() {
    this.optionsDisplay = !this.optionsDisplay;
  }

  public setBurnerTime(burnerTime: number) {

    if(burnerTime === this.chosenBurnerTime) {
      burnerTime = 0;
    }

    this.chosenBurnerTime = burnerTime;
  }

  public async createLink() {

    if(this.addSecretModal.message.length == 0) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'No message was added, please add and try again',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    let secret_id = uuid();

    this.addSecretModal.id = sha512(secret_id);
    this.addSecretModal.expires_at = this.chosenBurnerTime.toString();

    // as default, we encrypt the message in DB, with the UUID id.
    let encryptionKey = secret_id;

    // PW was set, so we update encryptionKey with the User-defined-Password.
    if(this.addSecretModal.password.length > 0) {
      encryptionKey = sha512(this.addSecretModal.password).toString();
      this.addSecretModal.password = sha512(encryptionKey).toString();
    }

    this.addSecretModal.message = CryptoJS.AES.encrypt(this.addSecretModal.message, encryptionKey).toString();

    const loading = await this.loadingCtrl.create({message: 'Creating Secret..'});
    await loading.present();

    (await this.secretapi.create(this.addSecretModal)).subscribe(async (response) => {
        await this.router.navigateByUrl("/secret/created?id=" + secret_id)
    },
    async error => {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'Something went wrong. Please try again',
        buttons: ['OK'],
      });
      await alert.present();
    },
        async () => {
          await loading.dismiss();
          this.addSecretModal = new Secret(); // reset
        })

  }

}
