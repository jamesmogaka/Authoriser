import {popup, page} from "../../../outlook/v/code/outlook.js";
//

export class test_baby extends popup<string>{
  
  constructor(mother: page) {
    super('./test_baby.html');
    //
  }

  async check():Promise<boolean>{
    return true;
  }

  async get_result():Promise<string>{
    //
    return (<HTMLInputElement>this.get_element('test')).value;
  }
}
