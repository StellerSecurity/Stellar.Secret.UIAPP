import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {SecretapiService} from "../../services/secretapi.service";

import {LoadingController, ToastController} from '@ionic/angular';
import {Secret} from "../../models/secret";
import * as CryptoJS from 'crypto-js';
@Component({
  selector: 'app-view',
  templateUrl: './view.page.html',
  styleUrls: ['./view.page.scss'],
})
export class ViewPage {

    private id : string = "";

    public secretModel : Secret = new Secret();

    public unlocked = false;

    public inputPassword = "";

    public loaded = false;

    constructor(private router: Router, private toastController: ToastController, private loadingCtrl: LoadingController, private secretapi: SecretapiService, private route: ActivatedRoute) {
      this.route.queryParams.subscribe(params => {
          this.id = params['id'];
          this.secret(this.id).then(r => {});
      });
    }

    public async copy() {

        // Select the text field
        var copyText = this.secretModel.message;

        // Copy the text inside the text field
        await navigator.clipboard.writeText(copyText);

        const toast = await this.toastController.create({
            message: 'The message has been copied.',
            duration: 3000,
            position: 'top'
        });

        await toast.present();
    }

    public async secret(id: string) {

        this.loaded = false;
        const loading = await this.loadingCtrl.create({
            message: 'Getting secret...'
        });

        await loading.present();

        // TODO: Add error handler.
        this.secretapi.view(id).subscribe(async (response) => {
            this.loaded = true;
            if(response.response_code !== 200) {
                alert('The Secret Link does not exist or has already been viewed.');
                await this.router.navigateByUrl("/");
            } else {
                this.secretModel = response;
                if(this.secretModel.password.length == 0) {
                   this.secretModel.message = CryptoJS.AES.decrypt(this.secretModel.message, this.id).toString(CryptoJS.enc.Utf8);
                   this.unlocked = true;
                }
            }

            await loading.dismiss();
        });
    }

    public unlockByPassword() {

        let decryptedMessage = CryptoJS.AES.decrypt(this.secretModel.message, this.inputPassword).toString(CryptoJS.enc.Utf8);

        if(decryptedMessage.length === 0) {
            alert('Wrong password, try again.');
        } else {
            this.secretModel.message = decryptedMessage;
            this.unlocked = true;
        }

    }

    public reply() {
        this.router.navigate(['/']).then(r => {})
    }

}
