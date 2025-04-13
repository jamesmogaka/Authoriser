import { view } from '../../../schema/v/code/schema.js';
import { quiz } from './quiz.js';
//
//Dialog is an abstract class that has 3 public methods:-
//-administer - the collecteds inputs from user
//- populate that filles a dialog box with inputs
//- get_raw_user_inputs that reads the user modified inputs
export abstract class dialog<Idata> extends quiz<Idata> {
    //
    constructor(
        //
        //The optional html fragment needed for constructing a dialogbox
        // This is the path to the data collection form
        public fragment_url?: string,
        //
        //Where to apend the dialog box in the current document
        public anchor?: HTMLElement,
        //
        //How to show the dialog, modal or modalless
        public modal: boolean = true,
        //
        //To implement the view has-a hierarchy
        parent?: view
    ) {
        //
        //Instantiate myalert which is the parent class of a dialog
        super(parent, fragment_url);
        //
        //Create the proxy
        this.proxy__ = this.create_element(
            'dialog',
            this.anchor ? this.anchor : this.document.body
        );
    }
    //
    //This method coordinates all data collection and processing activities. It shows the
    //dialog waits for the user to initiate a process after data entry and depending
    //on the process selected by the user the data enterd is retrieved from the form
    //validation checks are done to ensure the quality of the data collected then
    //fainally the process that the user selectd is undertaken returning the collected
    //data upon succes and closing the data collection dialog
    public async administer(): Promise<Idata | undefined> {
        //
        //Coordinate the data collection process and get the expeced result
        const result: Idata | undefined = await super.administer();
        //
        //Close the dialog box
        (this.proxy as HTMLDialogElement).close();
        //
        //Remove the dialog from the document
        this.proxy.remove();
        //
        //return the results
        return result;
    }
    //
    //Process of attaching the form fragment to the dialog box and populating the
    //form in case of data modification.After all these processes show the dailog
    //box to the user for data entry.
    protected async open(): Promise<{ submit: HTMLElement; cancel: HTMLElement }> {
        //
        //Finish the dialog set up process from the parent class
        const { submit, cancel } = await super.open();
        //
        if (this.modal) (this.proxy as HTMLDialogElement).showModal();
        else (this.proxy as HTMLDialogElement).show();
        //
        //Do the form preparations (adding targeted error reporting and marking
        //the required fields with asterisk)
        await this.onopen();
        //
        //Return the controll buttons
        return { submit, cancel };
    }
    //
    //Perform the final preparations on the data collection form ,i.e., adding
    //error reporting sections and also marking the required fields with asteriks
    public async onopen(): Promise<void> {
        //
        //Get all the data collection envelops
        //
        //Add a span with the class error which is for targeted error reporting
        //
        //Check if the field has a requird attribute and append an asterik to indicate
        //that the field is required
    }
}
