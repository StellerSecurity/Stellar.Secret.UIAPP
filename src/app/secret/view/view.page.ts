import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Params, Router} from "@angular/router";
import {SecretapiService} from "../../services/secretapi.service";

import {AlertController, LoadingController, ToastController} from '@ionic/angular';
import {Secret} from "../../models/secret";
import * as CryptoJS from 'crypto-js';
import {async} from "rxjs";
@Component({
  selector: 'app-view',
  templateUrl: './view.page.html',
  styleUrls: ['./view.page.scss'],
})
export class ViewPage implements OnInit {

    private id : string = "";

    public secretModel : Secret = new Secret();

    public unlocked = false;

    public inputPassword = "";

    public loaded = false;
    
    public openMessage = false;

    public passwordProtected = false;

    constructor(private router: Router, private toastController: ToastController, private alertController: AlertController, private loadingCtrl: LoadingController, private activatedRoute: ActivatedRoute, private secretapi: SecretapiService, private route: ActivatedRoute) {
        
        this.activatedRoute.params.subscribe(
            (params: Params) => {
                console.log(params['id']);
                this.id = params['id'];
            }
        )

    }

    ngOnInit(): void {
        console.log('hi');
        
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

    public async openMessageBox(){
        this.openMessage = true;

        this.loaded = false;
        const loading = await this.loadingCtrl.create({
            message: 'Getting secret...'
        });

        await loading.present();

        this.secretapi.view(this.id).subscribe(async (response) => {
            this.loaded = true;
            await loading.dismiss();
            if(response.response_code !== 200) {

                const alert = await this.alertController.create({
                    header: 'Secret error',
                    message: 'The Secret Link does not exist or has already been viewed.',
                    buttons: ['OK'],
                });

                await alert.present();

                await this.router.navigateByUrl("/");
            } else {
                this.secretModel = response;
                if(this.secretModel.password === null) {
                    this.secretModel.password = "";
                } else {
                    this.passwordProtected = true;
                }

                if(this.secretModel.password.length == 0) {
                   this.secretModel.message = CryptoJS.AES.decrypt(this.secretModel.message, this.id).toString(CryptoJS.enc.Utf8);
                   this.unlocked = true;
                }

                setTimeout(async () => {
                    await this.router.navigateByUrl("/");
                }, 300000);

            }

        });

    }

    public async unlockByPassword() {

        let decryptedMessage = CryptoJS.AES.decrypt(this.secretModel.message, this.inputPassword).toString(CryptoJS.enc.Utf8);

        if (decryptedMessage.length === 0) {
            const alert = await this.alertController.create({
                header: 'Secret error',
                message: 'The password is not correct. Try again.',
                buttons: ['OK'],
            });

            await alert.present();

        } else {
            this.secretModel.message = decryptedMessage;
            this.unlocked = true;
        }

    }

    public reply() {
        this.router.navigate(['/']).then(r => {})
    }

}
