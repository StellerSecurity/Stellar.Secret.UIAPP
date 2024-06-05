import { Component } from '@angular/core';
import {LoadingController} from "@ionic/angular";
import {SecretapiService} from "../services/secretapi.service";
import {Secret} from "../models/secret";
import {Router} from "@angular/router";
import { sha512, sha384, sha512_256, sha512_224 } from 'js-sha512';
import { v4 as uuid } from 'uuid';

import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {


  public addSecretModal = new Secret();

  public optionsDisplay = false;

  public burnerTimes = [1, 6, 24];

  public chosenBurnerTime = 0;
  constructor(private loadingCtrl: LoadingController, private router: Router, private secretapi: SecretapiService) {}

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
      return;
    }

    let secret_id = uuid();

    this.addSecretModal.id = sha512(secret_id);
    this.addSecretModal.expires_at = this.chosenBurnerTime.toString();

    // if no password is set, encrypt the message with the generated UUID.
    if(this.addSecretModal.password.length == 0) {
      this.addSecretModal.message = CryptoJS.AES.encrypt(this.addSecretModal.message, secret_id).toString();
    } else {
      this.addSecretModal.message = CryptoJS.AES.encrypt(this.addSecretModal.message, this.addSecretModal.password).toString();
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creating Secret..',
    });

    await loading.present();

    (await this.secretapi.create(this.addSecretModal)).subscribe(async (response) => {
        this.addSecretModal = new Secret(); // reset
        await this.router.navigateByUrl("/secret/created?id=" + secret_id)
        await loading.dismiss();
    });

  }

}
