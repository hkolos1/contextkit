import {bootstrapApplication} from '@angular/platform-browser';
import {provideZonelessChangeDetection} from '@angular/core';
import {Workspace} from './workspace';
bootstrapApplication(Workspace,{providers:[provideZonelessChangeDetection()]});
