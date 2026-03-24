import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { LoadingController, ModalController, Platform } from '@ionic/angular';

import { SecretapiService } from '../../services/secretapi.service';
import { Secret } from '../../models/secret';
import { ConfirmationModalComponent } from './confirmation-modal.component';
import { TranslationService } from 'src/app/services/translation.service';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-created',
  templateUrl: './created.page.html',
  styleUrls: ['./created.page.scss'],
})
export class CreatedPage {
  public id: string = '';
  public url: string = '';
  metaDescription: string = '';
  metaTitle: string = 'Created Secret Message - Stellar Secret';
  metaKeywords: string = '';

  public secret: Secret = new Secret();
  public copied = false;
  public popoverEvent: MouseEvent | null = null;

  constructor(
      @Inject(PLATFORM_ID) private platformId: object,
      private router: Router,
      private modalCtrl: ModalController,
      private secretapi: SecretapiService,
      private loadingCtrl: LoadingController,
      private route: ActivatedRoute,
      private platform: Platform,
      private translationService: TranslationService
  ) {
    const nav = this.router.getCurrentNavigation();
    const idFromNav = nav?.extras?.state?.['id'];
    const idFromHistory = history.state?.['id'];

    this.id = idFromNav || idFromHistory || '';

    if (!this.id) {
      this.router.navigate(['/']);
    } else {
      this.url = 'https://stellarsecret.io/' + this.id;
    }
  }

  private getBaseUrl(): string {
    if (isPlatformBrowser(this.platformId)) {
      const baseTag = document.getElementsByTagName('base')[0]?.href;

      if (baseTag && baseTag.length > 0) {
        return baseTag.endsWith('/') ? baseTag : baseTag + '/';
      }

      const origin = window.location.origin;
      return origin.endsWith('/') ? origin : origin + '/';
    }

    const fallback = 'https://stellarsecret.io/';
    return fallback.endsWith('/') ? fallback : fallback + '/';
  }

  private async lightTap(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // ignore on unsupported platforms
    }
  }

  private async mediumTap(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // ignore on unsupported platforms
    }
  }

  async handleCopy(ev: MouseEvent): Promise<void> {
    try {
      await this.copy();
    } catch {
      // clipboard failed
    }

    this.popoverEvent = ev;
    this.copied = true;

    setTimeout(() => {
      this.copied = false;
    }, 1200);
  }

  private async copy(): Promise<void> {
    const copyText = this.url;

    if (isPlatformBrowser(this.platformId) && navigator?.clipboard) {
      await navigator.clipboard.writeText(copyText);
    }
  }

  public async createSecret(): Promise<void> {
    await this.lightTap();
    await this.router.navigate(['/']);
  }

  public async delete(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ConfirmationModalComponent,
      cssClass: 'confirmation-popup',
    });

    modal.onDidDismiss().then(async (data) => {
      if (data?.data) {
        const confirm = data.data as boolean;

        if (confirm) {
          await this.mediumTap();

          const loading = await this.loadingCtrl.create({
            message: this.translationService.allTranslations?.BURNING_SECRET || 'Burning secret...',
          });

          await loading.present();

          this.secretapi.delete(this.id).subscribe(async () => {
            await this.router.navigate(['/']);
            await loading.dismiss();
          });
        }
      }
    });

    await modal.present();
  }

  async dismissModal(): Promise<void> {
    await this.lightTap();
    await this.modalCtrl.dismiss();
  }
}