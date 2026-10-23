import {NsisUpdater} from 'electron-updater';
// Keep the production Electron adapter and HTTP executor created by super().
// Passing a custom AppAdapter to NsisUpdater is a test-only path with no executor.
export class WindowsFolderUpdater extends NsisUpdater{
 constructor(root:string){super();Object.defineProperty(this.app,'baseCachePath',{value:root});}
}
