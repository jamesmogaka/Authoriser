import { page } from "../../../outlook/v/code/outlook.js";
import { authoriser, Iauthoriser } from "./authoriser.js";
import { user } from "../../../outlook/v/code/app.js";
import {mutall_error} from "../../../schema/v/code/schema.js";
//

export class test extends page implements Iauthoriser {
  //
  // Implement the authoriser as required by the Iauthoriser interface
  public authoriser: authoriser = new authoriser(this);

  constructor() {
    super();
    //
  }

  //Initiate the authorisation
  async authorise(): Promise<void> {
    //
    //Do the authorisation
    const user: user | undefined = await this.authoriser.administer();
    //
    //Show if authorisation sccceded or not
    if (!user) throw new mutall_error('Authorisation aborted');
    //
    //Authorisation was successful.
    // 
    // Wlecome the user
    const welcome_div = this.get_element("msg");

    // Remove the hidden attribute
    welcome_div.removeAttribute("hidden");
    //
    // Set the welcome message
    welcome_div.innerHTML = `Welcome ${user.name}`;
  }

  //
  // Show the test
  show() {
    //
  }
}
