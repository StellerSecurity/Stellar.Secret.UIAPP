import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {SecretapiService} from "../../services/secretapi.service";

import { LoadingController } from '@ionic/angular';
import {Secret} from "../../models/secret";

@Component({
  selector: 'app-view',
  templateUrl: './view.page.html',
  styleUrls: ['./view.page.scss'],
})
export class ViewPage implements OnInit {

    private id : string = "";

    public secretModel : Secret = new Secret();

    constructor(private router: Router, private loadingCtrl: LoadingController, private secretapi: SecretapiService, private route: ActivatedRoute) {
      this.route.queryParams.subscribe(params => {
          this.id = params['id'];
      });
    }

    ngOnInit() {
        this.secret("12345").then(r => {});
    }

    public async secret(id: string) {

        const loading = await this.loadingCtrl.create({
            message: 'Getting secret...'
        });

        await loading.present();

        // TODO: Add error handler.
        this.secretapi.view(id).subscribe(async (response) => {
            this.secretModel = response;
            await loading.dismiss();
        });
    }

    public reply() {
        this.router.navigate(['/']).then(r => {})
    }

}
