import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {SecretapiService} from "../../services/secretapi.service";
import {LoadingController, ToastController} from "@ionic/angular";
import {Secret} from "../../models/secret";

@Component({
  selector: 'app-created',
  templateUrl: './created.page.html',
  styleUrls: ['./created.page.scss'],
})
export class CreatedPage implements OnInit {

  public id: string = "";

  public url: string = "";

  public secret: Secret = new Secret();

  constructor(private router: Router, private toastController: ToastController, private secretapi: SecretapiService, private loadingCtrl: LoadingController, private route: ActivatedRoute) {
    this.route.queryParams.subscribe(async params => {
      this.id = params['id'];

      this.url = "https://stellarsecret.io/" + this.id;

      /*const loading = await this.loadingCtrl.create({
        message: 'Getting secret...',
      });

      await loading.present();

      (
          await this.secretapi.view(this.id)
      ).subscribe(async (response) => {
        this.secret = response;
        console.log(response)
        await loading.dismiss();
      });*/


    });
  }



  ngOnInit() {
  }

  public async copy() {

    // Select the text field
    var copyText = this.url;

    // Copy the text inside the text field
    await navigator.clipboard.writeText(copyText);

    const toast = await this.toastController.create({
      message: 'The URL has been copied.',
      duration: 3000,
      position: 'top'
    });


    await toast.present();

  }

  public createSecret() {
    this.router.navigate(['/'])
  }

  public async delete() {
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

  }

}
