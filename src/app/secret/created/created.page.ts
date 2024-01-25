import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {SecretapiService} from "../../services/secretapi.service";
import {LoadingController} from "@ionic/angular";

@Component({
  selector: 'app-created',
  templateUrl: './created.page.html',
  styleUrls: ['./created.page.scss'],
})
export class CreatedPage implements OnInit {

  constructor(private router: Router, private secretapi: SecretapiService, private loadingCtrl: LoadingController) { }

  ngOnInit() {
  }

  public createSecret() {
    this.router.navigate(['/'])
  }

  public async delete() {
    const loading = await this.loadingCtrl.create({
      message: 'Burning secret...',
    });

    await loading.present();

    (
        await this.secretapi.delete("12345")
    ).subscribe(async (response) => {
        await this.router.navigate(['/'])
        await loading.dismiss();
    });

  }

}
