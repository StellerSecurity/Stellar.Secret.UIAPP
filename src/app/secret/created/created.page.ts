import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { SecretapiService } from "../../services/secretapi.service";
import {LoadingController, ToastController, ModalController, Platform} from "@ionic/angular";
import { Secret } from "../../models/secret";
import { ConfirmationModalComponent } from './confirmation-modal.component';

@Component({
  selector: 'app-created',
  templateUrl: './created.page.html',
  styleUrls: ['./created.page.scss'],
})
export class CreatedPage {

  public id: string = "";

  public url: string = "";

  public secret: Secret = new Secret();

  constructor(private router: Router,
              private modalCtrl: ModalController, private toastController: ToastController,
              private secretapi: SecretapiService,
              private loadingCtrl: LoadingController, private route: ActivatedRoute, private platform: Platform) {
    this.route.queryParams.subscribe(async params => {
      this.id = params['id'];
      this.url = "https://stellarsecret.io/" + this.id;
    });
  }


  public async copy() {

    // Select the text field
    const copyText = this.url;

    // Copy the text inside the text field
    await navigator.clipboard.writeText(copyText);

    const toast = await this.toastController.create({
      message: 'The Secret URL has been copied.',
      duration: 3000,
      position: 'bottom'
    });


    await toast.present();

  }

  public createSecret() {
    this.router.navigate(['/'])
  }

  public async delete() {
    const modal = await this.modalCtrl.create({
      component: ConfirmationModalComponent,
      cssClass: 'confirmation-popup'
    });

    modal.onDidDismiss().then(async (data) => {
      if (data && data.data) {
        const confirm = data.data as boolean;
        if (confirm) {
          // User confirmed deletion, proceed with deletion logic
          const loading = await this.loadingCtrl.create({
            message: 'Burning secret...',
          });

          await loading.present();

          (
            await this.secretapi.delete(this.id)
          ).subscribe(async (response) => {
            await this.router.navigate(['/'])
            await loading.dismiss();
          });
        } else {
          // User canceled deletion, do nothing
        }
      }
    });

    return await modal.present();
  }

}
