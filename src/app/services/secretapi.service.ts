import { Injectable } from '@angular/core';
import {Secret} from "../models/secret";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {environment} from "../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class SecretapiService {

  constructor(private http: HttpClient) { }

  public view(id: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http.get<any>(environment.secret_api_url + "v1/secretcontroller/secret?id=" + id,httpOptions).pipe();
  }

  public delete(id: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http.delete<any>(environment.secret_api_url + "v1/secretcontroller/delete?id=" + id,httpOptions).pipe();
  }


  public create(secret: Secret) {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http.post<any>(environment.secret_api_url + "v1/secretcontroller/add", secret, httpOptions).pipe();

  }

}
