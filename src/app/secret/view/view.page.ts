import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import {ActivatedRoute, Params, Router} from "@angular/router";
import {SecretapiService} from "../../services/secretapi.service";

import {AlertController, LoadingController, ToastController} from '@ionic/angular';
import {Secret} from "../../models/secret";
import * as CryptoJS from 'crypto-js';
import {async} from "rxjs";
import { isPlatformBrowser } from '@angular/common';
import { TranslationService } from 'src/app/services/translation.service';
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
    public url: string = "";
    metaDescription:string = '';
    metaTitle:string = 'Secret Message - Stellar Secret';
    metaKeywords:string = '';


    constructor(
        @Inject(PLATFORM_ID) private platformId: Object,
        private router: Router, private toastController: ToastController, private alertController: AlertController, private loadingCtrl: LoadingController, private activatedRoute: ActivatedRoute, private secretapi: SecretapiService, private route: ActivatedRoute,
        private translationService: TranslationService) {
        
        this.activatedRoute.params.subscribe(
            (params: Params) => {
                this.id = params['id'];
            }
        )

    }

    ionViewWillEnter(){
        this.clear();
    }


    base64ToFile(base64String: string, mimeType: string, fileName: string) {
        // Remove data URL scheme if present
        const base64Data = base64String.replace(/^data:.+;base64,/, '');
        const byteCharacters = atob(base64Data); // Decode Base64 string
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Create a link element to download the file
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);
    }

    ngOnInit(): void {}

    public async copy() {

        // Select the text field
        var copyText = this.secretModel.message;

        // Copy the text inside the text field
        if(isPlatformBrowser(this.platformId)){
            await navigator.clipboard.writeText(copyText);

        const toast = await this.toastController.create({
            message: this.translationService.allTranslations.THE_MESSAGE_HAS_BEEN_COPIED,
            duration: 3000,
            position: 'top'
        });


            await toast.present();
        }
    }

    public async openMessageBox(){
        this.openMessage = true;


        this.loaded = false;
        const loading = await this.loadingCtrl.create({
            message: this.translationService.allTranslations.GETTING_SECRET
        });

        await loading.present();

        this.secretapi.view(this.id).subscribe(async (response) => {
            this.loaded = true;
            await loading.dismiss();
            if(response.response_code !== 200) {

                const alert = await this.alertController.create({
                    header: this.translationService.allTranslations.SECRET_ERROR,
                    message: this.translationService.allTranslations.THE_SECRET_LINK_DOES_NOT_EXIST_OR_HAS_ALREADY_BEEN_VIEWED,
                    buttons: [this.translationService.allTranslations.OK],
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

                   if(this.secretModel.files !== undefined && this.secretModel.files !== null) {
                       this.secretModel.files[0].content = CryptoJS.AES.decrypt(this.secretModel.files[0].content, this.id).toString(CryptoJS.enc.Utf8);
                   }

                   this.unlocked = true;
                }

                setTimeout(async () => {
                    this.clear();
                    await this.router.navigateByUrl("/");
                }, 300000);

            }

        });

    }

    public async downloadAttachedFile() {

        if (this.secretModel.files !== undefined && this.secretModel.files !== null) {

            const loading = await this.loadingCtrl.create();
            await loading.present();

            let mime = this.secretModel.files[0].content.split(";");
            mime[0] = mime[0].replace("data:", "");
            // TODO: MAYBE USE THE ORIGINAL FILE-NAME THE SENDER ADDED?
            let randomNumber = Math.floor(Math.random() * (999999999 - 9999) + 9999);
            this.base64ToFile(this.secretModel.files[0].content, mime[0], "File-" + randomNumber);

            await loading.dismiss();

        } else {
            alert(this.translationService.allTranslations.SOMETHING_WENT_WRONG)
        }


    }

    public async unlockByPassword() {

        let decryptedMessage = CryptoJS.AES.decrypt(this.secretModel.message, this.inputPassword).toString(CryptoJS.enc.Utf8);

        if (decryptedMessage.length === 0) {
            const alert = await this.alertController.create({
                header: this.translationService.allTranslations.SECRET_ERROR,
                message: this.translationService.allTranslations.THE_PASSWORD_IS_NOT_CORRECT_TRY_AGAIN,
                buttons: [this.translationService.allTranslations.OK],
            });

            await alert.present();

        } else {
            this.secretModel.message = decryptedMessage;

            if(this.secretModel.files !== undefined && this.secretModel.files !== null) {
                this.secretModel.files[0].content = CryptoJS.AES.decrypt(this.secretModel.files[0].content, this.inputPassword).toString(CryptoJS.enc.Utf8);
            }

            this.unlocked = true;
        }

    }

    public reply() {
        this.clear();
        this.router.navigate(['/']).then(r => {})
    }

    private clear() {
        this.secretModel = new Secret();
    }

}
