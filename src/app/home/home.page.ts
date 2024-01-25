import { Component } from '@angular/core';
import {LoadingController} from "@ionic/angular";
import {SecretapiService} from "../services/secretapi.service";
import {Secret} from "../models/secret";
import {Router} from "@angular/router";

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  public addSecretModal = new Secret();

  public optionsDisplay = false;

  constructor(private loadingCtrl: LoadingController, private router: Router, private secretapi: SecretapiService) {}

  public optionsToggle() {
    this.optionsDisplay = !this.optionsDisplay;
  }

  public async createLink() {

    const loading = await this.loadingCtrl.create({
      message: 'Creating Secret..',
    });

    await loading.present();

    (await this.secretapi.create(this.addSecretModal)).subscribe(async (response) => {
        this.router.navigateByUrl("/secret/created?id=" + response.id)
        await loading.dismiss();
    });

  }

}
