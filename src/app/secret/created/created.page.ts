import { Component, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { LoadingController, ModalController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

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
export class CreatedPage implements OnDestroy {
  public id: string = '';
  public url: string = '';
  metaDescription: string = '';
  metaTitle: string = 'Created Secret Message - Stellar Secret';
  metaKeywords: string = '';

  public secret: Secret = new Secret();
  public copied = false;
  public copyFailed = false;
  private copyAttempt = 0;
  private copyTimer?: ReturnType<typeof setTimeout>;
  public popoverEvent: MouseEvent | null = null;
  private readonly publicBaseUrl = 'https://stellarsecret.io/';

  constructor(
      @Inject(PLATFORM_ID) private platformId: object,
      private router: Router,
      private modalCtrl: ModalController,
      private secretapi: SecretapiService,
      private loadingCtrl: LoadingController,
      private translationService: TranslationService
  ) {}

  ionViewWillEnter(): void {
    // Ionic can reuse this page, so resolve state on every entry, not construction.
    this.id = '';
    this.url = '';
    this.clearCopyFeedback();

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const nav = this.router.getCurrentNavigation();
    // During navigation, do not fall back to the previous history entry.
    const id = nav ? nav.extras.state?.['id'] : window.history.state?.['id'];
    this.id = typeof id === 'string' ? id.trim() : '';

    if (!this.id) {
      this.router.navigate(['/']);
    } else {
      this.url = `${this.getBaseUrl()}${this.id}`;
    }
  }

  private getBaseUrl(): string {
    if (Capacitor.isNativePlatform()) {
      return this.publicBaseUrl;
    }

    if (isPlatformBrowser(this.platformId)) {
      const baseTag = document.getElementsByTagName('base')[0]?.href;

      if (baseTag && baseTag.length > 0) {
        return baseTag.endsWith('/') ? baseTag : `${baseTag}/`;
      }

      const origin = window.location.origin;
      return origin.endsWith('/') ? origin : `${origin}/`;
    }

    return this.publicBaseUrl;
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

  ionViewWillLeave(): void {
    this.clearCopyFeedback();
  }

  ngOnDestroy(): void {
    this.clearCopyFeedback();
  }

  private clearCopyFeedback(): void {
    this.copyAttempt += 1;
    if (this.copyTimer) {
      clearTimeout(this.copyTimer);
      this.copyTimer = undefined;
    }
    this.copied = false;
    this.copyFailed = false;
    this.popoverEvent = null;
  }

  async handleCopy(ev: MouseEvent): Promise<void> {
    this.clearCopyFeedback();
    const attempt = this.copyAttempt;
    let success = false;
    try {
      success = await this.copy();
    } catch {
      // Report failure instead of claiming that the clipboard was updated.
    }
    if (attempt !== this.copyAttempt) {
      return;
    }
    this.copyFailed = !success;
    if (!success) {
      return;
    }

    this.popoverEvent = ev;
    this.copied = true;
    this.copyTimer = setTimeout(() => {
      this.copied = false;
      this.copyTimer = undefined;
    }, 1200);
  }

  private async copy(): Promise<boolean> {
    if (!this.url || !isPlatformBrowser(this.platformId)) {
      return false;
    }
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(this.url);
      return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = this.url;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    try {
      textArea.focus();
      textArea.select();
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
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
