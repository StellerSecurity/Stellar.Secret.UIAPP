import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { SecretapiService } from "../../services/secretapi.service";
import { LoadingController, ModalController, Platform } from "@ionic/angular";
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
  metaDescription: string = '';
  metaTitle: string = 'Created Secret Message - Stellar Secret';
  metaKeywords: string = '';

  public secret: Secret = new Secret();
  public copied = false;
  public popoverEvent: MouseEvent | null = null;

  constructor(
      @Inject(PLATFORM_ID) private platformId: Object,
      private router: Router,
      private modalCtrl: ModalController,
      private secretapi: SecretapiService,
      private loadingCtrl: LoadingController,
      private route: ActivatedRoute,
      private platform: Platform,
      private translationService: TranslationService
  ) {
    // First, try getCurrentNavigation (works on first navigation)
    const nav = this.router.getCurrentNavigation();
    const idFromNav = nav?.extras?.state?.['id'];

    // Fallback to history.state for reloads / direct access
    const idFromHistory = history.state?.['id'];

    this.id = idFromNav || idFromHistory || '';

    if (!this.id) {
      // No id available → user hit /secret/created directly, just send them home
      this.router.navigate(['/']);
    } else {
      //this.url = this.getBaseUrl() + this.id;
      this.url = "http://stellarsecret.io/" + this.id;
    }
  }

  private getBaseUrl(): string {
    if (isPlatformBrowser(this.platformId)) {
      // Try to respect <base href="..."> first
      const baseTag = document.getElementsByTagName('base')[0]?.href;

      if (baseTag && baseTag.length > 0) {
        return baseTag.endsWith('/') ? baseTag : baseTag + '/';
      }

      const origin = window.location.origin;
      return origin.endsWith('/') ? origin : origin + '/';
    }

    // Fallback for non-browser env
    const fallback = 'https://stellarsecret.io/';
    return fallback.endsWith('/') ? fallback : fallback + '/';
  }

  async handleCopy(ev: MouseEvent) {
    try {
      await this.copy();
    } catch (e) {
      // optional: you can add a toast here if clipboard fails
    }

    this.popoverEvent = ev;
    this.copied = true;

    setTimeout(() => (this.copied = false), 1200);
  }

  private async copy() {
    const copyText = this.url;

    if (isPlatformBrowser(this.platformId)) {
      await navigator.clipboard.writeText(copyText);
    }
  }

  public createSecret() {
    this.router.navigate(['/']);
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
          const loading = await this.loadingCtrl.create({
            message: this.translationService.allTranslations.BURNING_SECRET,
          });

          await loading.present();

          this.secretapi.delete(this.id).subscribe(
              async (response) => {
                await this.router.navigate(['/']);
                await loading.dismiss();
              }
          );
        } else {
          // User cancelled, do nothing
        }
      }
    });

    return await modal.present();
  }

  dismissModal() {
    this.modalCtrl.dismiss();
  }

}
