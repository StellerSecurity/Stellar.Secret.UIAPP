// footer.component.ts
import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [NgIf],
})
export class FooterComponent implements OnInit {
  showFooterLinks = true;

  ngOnInit(): void {
    const isIOSNativeApp =
        Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

    // Hide footer links when running in Capacitor on iOS
    this.showFooterLinks = !isIOSNativeApp;
  }

  navigateToUrl(url: string): void {
    window.location.href = url;
  }
}
