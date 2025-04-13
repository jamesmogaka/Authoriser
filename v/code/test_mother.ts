import { Iauthoriser, authoriser } from "./authoriser.js";
import {view} from "../../../schema/v/code/schema.js";
//

export class test_mother extends view implements Iauthoriser{

  public authoriser:authoriser = new authoriser(this);

  constructor() {
    super();
    //
    
  }

  //Initiate the authorisation
  async authorise(): Promise<void> {
    //
    await this.authoriser.administer()
    //
    alert(JSON.stringify(this.authoriser.user));
  }

  //
  // Show the test
  show() {
    //
    alert('mother showing')
  }
}
