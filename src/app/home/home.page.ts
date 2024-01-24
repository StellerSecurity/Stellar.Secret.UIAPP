import { Component } from '@angular/core';
import {LoadingController} from "@ionic/angular";

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  constructor(private loadingCtrl: LoadingController) {}

  public async createLink() {
    const loading = await this.loadingCtrl.create({
      message: 'Creating Secret..',
    });

    await loading.present();
  }

}
