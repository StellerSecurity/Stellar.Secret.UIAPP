import {Component, NgZone} from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Router } from '@angular/router';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Platform } from '@ionic/angular';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private router: Router, private zone: NgZone, public platform: Platform) {
   this.startup();
  }

  public startup() {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.zone.run(() => {
        // Example url: https://beerswift.app/tabs/tab2
        // slug = /tabs/tab2
        const slug = event.url.split(".io").pop();
        if (slug) {
          console.log("started...");
          this.router.navigateByUrl(slug);
        }
        // If no match, do nothing - let regular routing
        // logic take over
      });
    });

    if(this.platform.is('android')) {
      StatusBar.setBackgroundColor({color: "black"}).then(r => {});
    }

  }

}
