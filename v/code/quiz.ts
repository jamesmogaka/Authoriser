import { view } from "../../../schema/v/code/schema.js";
//
import { mutall_error, fuel } from "../../../schema/v/code/schema.js";
//
import { fluctuate } from "./fluctuate.js";

//
//The general definition of a group of user inputs is characterised by the
//'type' keyword, as a discriminant. This construct allows us to design forms for
//collecting sophisticated data, Z, defined below:-
/*
type Z = A|B|C

where

A extends discriminant{...}
B extends discriminant{...}
C extends discriminant{...}
 
*/
export interface discriminant {
	//
	//The discriminant key
	type: string;
}

//The (possibly erroenous) user inputs for some clean data type, x, is defined
//as follows:-
export type dirty<x> =
	//
	//If the clean version, x, is a group, then its raw version is the same as x
	//with all the key values converted to raw (except the discriminant, key,
	//'type'. The raw data may involve all or some of the keys of x
	//
	//If the clean version, x, is a discriminant, then its raw version is...
	x extends discriminant
		? //
		  //...a similar discriminant with the following prperties:-
		  {
				[key in keyof x]: key extends "type" //The key's value depends on its type. //
					? //
					  //If the type key is the discriminant, then is not part of the inputs
					  //to be captured by the user.
					  x[key]
					: //
					  //If tthe key is anythng else then it is candidate for user inputs
					  //and therefore can be dirty
					  dirty<x[key]>;
		  }
		: //
		  //...the desired data, x, with an error possibility or null.
		  x | Error | null;
//Quiz is an abstract class that helps to collect data of any type <i> thru
//some dirty version to the final version of type <i>
//The user must implement the following methods:-
//- populate: fills a dialog box with inputs on load
//- read: extracts the user modified inputs for
//- execute: uses the inputs to execute a save-like operation, e.g., writing
//to a database, effecting registration, etc.
//The main public methods are:-
//- administer: collects inputs from u+ser
export abstract class quiz<i> extends view {
	//
	//The element that represents the visual dimension of the class
	public proxy__: HTMLElement;
	//
	public get proxy(): HTMLElement {
		return this.proxy__;
	}
	//
	//A dialog has a fluatuate object that supports collapsing and expanding
	//of inputs to simplify data entry for complex forms
	protected fluctuate: fluctuate;
	//
	constructor(
		//
		//To implement the view has-a hierarchy
		parent?: view,
		//
		//The html code needed for constructing a quiz, if any. If not
		//provided the user can programmaticaly provide the code by
		//overriding the populate method. The mashamba project is a case in point
		public url?: string
	) {
		//
		super(parent, { url });
		//
		//The proxy for this page is the document's body
		this.proxy__ = this.document.body;
		//
		//Initialiaze support for expanding and collapsing input details
		// why pass the reference to the creator??? - this
		this.fluctuate = new fluctuate();
	}
	//
	//Fill the dialog box with the given data, typically obtained from a database
	//This section is particularly useful in cases of modification of data.
	//When a dialog instance is created with data then override this method
	//to provide the prefferd way of displaying the data to the dialog form.
	abstract populate(): Promise<void>;
	//
	//The opposite of populate; it reads and returns data from a dialog form.
	//The returned data is a dirty version of teh output
	abstract read(): Promise<dirty<i>>;
	//
	//Run the process that led to the data collection in the first place.
	//Doing it here means that we still have access to the dialg that was used for data
	//collection so hthat if the execute fails we can edit the data and
	//re-execute it. Here are 2 examples of execute:-
	//-- saving the data to a database
	//-- performing a user authentication
	abstract execute(input: i): Promise<"Ok" | Error>;
	//
	//This method coordinates all data collection and processing activities. It shows the
	//dialog waits for the user to initiate a process after data entry and depending
	//on the process selected by the user the data enterd is retrieved from the form
	//validation checks are done to ensure the quality of the data collected then
	//fainally the process that the user selectd is undertaken returning the collected
	//data upon succes and closing the data collection dialog
	public async administer(): Promise<i | undefined> {
		//
		//Show the dialog (there may be a need to fetch a url from the server)
		const { submit, cancel } = await this.open();
		//
		//Wait for the user to click either save or cancel button
		const result: i | undefined = await this.get_user_response(
			submit,
			cancel
		);
		//
		//Return eithre the data collected or undefined
		return result;
	}
	//
	//Show the dialog (there may be a need to fetch a url from the server)
	//This proceeds by attaching the form fragment to the dialog box and populate the
	//form in case of data modification. Then show the box to enable data entry
	protected async open(): Promise<{
		submit: HTMLElement;
		cancel: HTMLElement;
	}> {
		//
		//If the url is provided, use it to show the dialog box
		if (this.url) await this.show(this.url);
		//
		//Paint the dialog box to refelect the user's wish
		await this.populate();
		//
		//Add event listeners to radio buttons to support fluctuation, i.e.,
		//expansion and collapsing of radin button sections to guide data entry
		this.onload();
		//
		//Return the submit and cancel buttons as required by this method.
		//Consider constructing them if they are not available
		return {
			submit: this.get_element("submit"),
			cancel: this.get_element("cancel"),
		};
	}
	//
	//Add event listeners to radio buttons to support fluctuation, i.e.,
	//expansion and collapsing of radio button sections to guide data entry
	protected onload(): void {
		//
		//Get all the radio input elements from the form
		const radios = Array.from(
			this.document.querySelectorAll('input[type="radio"]')
		) as Array<HTMLInputElement>;
		//
		//Add the flactuate functionality to all the radio buttons
		radios.forEach(
			radio => (radio.onclick = () => fluctuate.onclick(radio))
		);
		//
		//Show the form in a default manner
	}
	//
	//Use the given url to show this dialog box
	private async show(url: string): Promise<void> {
		//
		//Request for the content of the file specified by the path
		const response: Response = await fetch(url);
		//
		//Abort his procedure if there was an error in server-client
		//communication
		if (!response.ok)
			throw new mutall_error(
				`Fetching '${url}' failled with status code '${response.status}'.<br/> 
            The status text is '${response.statusText}'`
			);
		//
		//Append the string to the html of the dialog
		this.proxy.innerHTML = await response.text();
		//
		//Get whatever form was appended to the dialog
		const form = this.proxy.querySelector("form");
		//
		//If no form was appended discontinue the process at this point
		if (!form) return;
		//
		//Prevent forms default behaviour
		form.onsubmit = e => e.preventDefault();
		//
		//Handle clearance of all error reports on the form
		form.oninput = () => this.on_input();
	}
	//
	//Clear the error messages in the input form immedietly the user starts to input
	private on_input(): void {
		//
		//Get the elements with class 'error' then remove the error message
		const errors = this.document.querySelectorAll(".error");
		//
		//Clear any error messages on the form
		errors.forEach(error => (error.textContent = ""));
	}
	//
	//We wait for the user to enter the data that is required in the form; then
	//initate either one of the following two processes:-
	//1. submit or
	//2. cancel
	//Based on the user selected process we perform relevant actions
	protected get_user_response(
		submit: HTMLElement,
		cancel: HTMLElement
	): Promise<i | undefined> {
		//
		//Wait for the user to enter data and initiate the desired process
		return new Promise(resolve => {
			//
			//After entering input details the user can either
			//
			// ...submit the data
			submit.onclick = async () => await this.submit(resolve);
			//
			// ... or terminate the process by canceling
			cancel.onclick = () => resolve(undefined);
		});
	}
	//
	//On submit we collect the data that the user entered in the form then save
	// it considering:-
	//--the different sources of the data
	//--the need for pinpointed error reporting
	//--the need for resolving the promised data upon succesful saving.
	public async submit(resolve: (result: i) => void): Promise<void> {
		//
		//Retrieve the information that was entered by the user (with all its
		//possible errors)
		const input: dirty<i> = await this.read();
		//
		//Check the raw data for errors, reporting them if any
		const output: i | undefined = this.check(input);
		//
		//Continue only of there were no errors. Note the explicit use of '===',
		//just incase output was a boolean value
		if (output === undefined) return;
		//
		//Ue the data to execute a user defined operation, e.g., saving he data
		//to a database
		const result: "Ok" | Error = await this.execute(output);
		//
		//Resolve the promised data if the exceute operation was succesful
		if (result === "Ok") resolve(output);
		//
		///..otherwise report the error in a general fashion, i.e., not targeting
		//a specific user input
		else this.report_error("report", result.message);
	}

	//Check the raw data for errors, returning with the clean data if there
	//is none or void if there are. The errors are reported in a key-targeted
	//fashion -- thus giving the user a better error handling experience than
	//the common (simpler) practice
	check(input: dirty<i>): i | undefined {
		//
		//If input is not a diacriminant then deal with it
		if (!this.is_discriminant(input)) return this.check_simple_input(input);
		//
		//This is a discriminat. Cjeck  everyone of its keys
		//
		//Isolate the all the dirt  keys. N.B. Object keys are always strings.
		//Coerce them to the correct type (so that the next filtering can use
		//the correct data types). Also, the data type for keyof is
		//string|null|Symbol. Its the string we want.
		const keys = Object.keys(input) as Array<keyof dirty<i>>;
		//
		//Select the keys with erroneous values
		const err_keys = keys.filter(key => input[key] instanceof Error);
		//
		//If errors are found, report them to the user and discontinue this
		//check with an undefined result
		if (err_keys.length > 0) {
			//
			//Report the errors
			err_keys.forEach(key => {
				//
				//Get the k'th value; it muat be an error because filtering
				//ensured so
				const error = <Error>input[key];
				//
				//Report the error message targeting the key's place holder.
				this.report_error(<string>key, error.message);
			});
			//
			//There are errors in the raw data, so return the result as undefined
			//(as opposed to clean data)
			return undefined;
		}
		//If the user needs additional checks, the this stub is provided for this
		//purpose
		//const x:Ifuel|undefined = this.oncheck(input)
		//
		//There are no errors in the user inputs. Return the result as the clean
		//data. The unkknown conversion is a suggestion by Intellisense
		return input as i;
	}

	//Checks if the given input is a discriminant or not
	is_discriminant(input: any): input is discriminant {
		//
		//An input is a discriminant if it has a key called type, and whose
		//data type is the discriminating string.
		return input.type && typeof input.type === "string";
	}

	//Check a simple input.
	check_simple_input(input: any): any {
		//
		//If the input is not an error, retrn it;
		if (!(input instanceof Error)) return input;
		//
		//Otherwise report it in the general area
		this.report_error("report", String(input));
		//
		//...and return undefined
		return undefined;
	}

	//
	//Clear the shared error reporting placeholder. The holder is created if not
	//provided for
	public clear_errors(): void {
		//
		//Get report placeholder...
		const holder: HTMLElement =
			//
			//...that exists
			this.document.getElementById("report") ??
			//
			//...or create a new one at the end of the body
			this.create_element("div", this.document.body, { id: "report" });
		//
		//Clear it
		holder.innerHTML = "";
	}
}
