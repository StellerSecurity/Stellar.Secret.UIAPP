import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { HowItWorksPage } from './how-it-works/how-it-works.page';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'secret/created',
    loadChildren: () => import('./secret/created/created.module').then( m => m.CreatedPageModule)
  },
  {
    path: 'how-it-works',
    loadChildren: () => import('./how-it-works/how-it-works.module').then( m => m.HowItWorksPageModule)
    //component: HowItWorksPage
  },
  {
    path: 'terms-and-conditions',
    loadChildren: () => import('./terms-and-conditions/terms-and-conditions.module').then( m => m.TermsAndConditionsModule)
  },
  {
    path: 'privacy-policy',
    loadChildren: () => import('./privacy-policy/privacy-policy.module').then( m => m.PrivacyPolicyModule)
  },
  {
    path: ':id',
    loadChildren: () => import('./secret/view/view.module').then( m => m.ViewPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
