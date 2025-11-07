import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { SecretapiService } from "../../services/secretapi.service";
import {LoadingController, ToastController, ModalController, Platform} from "@ionic/angular";
import { Secret } from "../../models/secret";
import { ConfirmationModalComponent } from './confirmation-modal.component';
import { isPlatformBrowser } from '@angular/common';
import { TranslationService } from 'src/app/services/translation.service';

@Component({
  selector: 'app-created',
  templateUrl: './created.page.html',
  styleUrls: ['./created.page.scss'],
})
export class CreatedPage {

  public id: string = "";

  public url: string = "";
  metaDescription:string = '';
  metaTitle:string = 'Created Secret Message - Stellar Secret';
  metaKeywords:string = '';

  public secret: Secret = new Secret();
  public copied = false;
  public popoverEvent: MouseEvent | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
              private modalCtrl: ModalController, private toastController: ToastController,
              private secretapi: SecretapiService,
              private loadingCtrl: LoadingController, private route: ActivatedRoute, private platform: Platform,
              private translationService: TranslationService) {
    this.route.queryParams.subscribe(async params => {
      this.id = params['id'];
      this.url = "https://stellarsecret.io/" + this.id;
    });
  }

    async handleCopy(ev: MouseEvent) {
        // your existing copy() logic (or inline)
        try {
            await this.copy(); // or: await navigator.clipboard.writeText(this.value);
        } catch (e) {
            // optional: show an error toast instead
        }

        this.popoverEvent = ev;  // positions the popover at the button
        this.copied = true;

        // auto-hide after 1.2s
        setTimeout(() => (this.copied = false), 1200);
    }

  private async copy() {

    // Select the text field
    const copyText = this.url;

    // Copy the text inside the text field
    if(isPlatformBrowser(this.platformId)) {
      await navigator.clipboard.writeText(copyText);
    }
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
            message: this.translationService.allTranslations.BURNING_SECRET,
          });

          await loading.present();

          (
              this.secretapi.delete(this.id)
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

  dismissModal() {
    this.modalCtrl.dismiss();
  }

}
