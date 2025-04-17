//Support for user registraction
import {
	mutall_error,
	view,
	mymap,
	basic_value,
} from "../../../schema/v/code/schema.js";
import { myalert } from "../../../schema/v/code/mutall.js";
import { user } from "../../../outlook/v/code/app.js";
import { layout } from "../../../schema/v/code/questionnaire.js";
import { io, io_parent } from "./io.js";
import { dialog } from "./dialog.js";
//
// Define the IAutoriser interface
export interface Iauthoriser {
	authoriser: authoriser;
	authorise(): Promise<void>;
}

//
// The section id is the id of the fieldset section, i.e. the registraction operations
export type section_id = "login" | "forgot" | "change" | "sign_up";
//
//The user interace, as opposed to a user object. Needed to support reading of
// user data from a datanase
export type user_interface = {
	user: number;
	name: string;
	password: string;
	email: string;
};
//
// The authoriser class is a page that is used to authorise a user to allow them access to
// mutall applications.
// It allows the user to login, register, or reset their password.
export class authoriser extends dialog<user | undefined> {
	public user?: user;
	//
	//Key for saving a user to the local storage
	static user_key: string = "last_logged_in_user";
	//
	//The sections of an authoriser: login, forgot, etc
	public sections?: mymap<section_id, section>;
	//
	// The css refers to the button you want to hook your authoriser to
	constructor(parent?: view) {
		//
		//The url pointing to the registration form
		const url: string = "./authoriser.html";
		//
		//The section on your main page on where to anchor the dialog
		//NB:The dialog by default will be shown on the document body
		const anchor: HTMLElement | undefined = undefined;
		//
		//How to present the dialog
		const modal: boolean = true;
		//
		//Initialize the mother page using the authorizer.html
		super(url, anchor, modal, parent);
	}
	//
	// Get the sections of the authoriser page
	set_sections(): void {
		//
		// Create the sections from the identified fieldsets in the html
		this.sections = this.get_sections();
		//
		// Get the button for submitting the event
		const submit: HTMLElement = this.get_element("submit");
		//
		// Add the event listener for submit
		submit.onclick = (evt: Event) => this.authorise(evt);
		//
		// Get the radio buttons for the sections
		const radios: NodeListOf<HTMLInputElement> =
			this.document.querySelectorAll('input[type="radio"]');
		//
		//Add the event listener for the radio buttons
		radios.forEach(radio => {
			radio.onclick = (evt: Event) => this.clear_errors();
		});
	}
	//
	// When the form data is submitted on the page do the authorisation
	async authorise(event: Event): Promise<void> {
		//
		// Prevent the default form submission
		event.preventDefault();

		//
		// Perform the authorisation based on the selected operation
		const user: user | undefined = await this.section.authorise();
		//
		//Do not update the last user if the authorisaton failed
		if (!user) return;
		//
		//Authorisation succeeded; update the loca storage
		this.user = user;
		const userData = {
			name: user.name,
			pk: user.pk,
		};
		window.localStorage.setItem(
			authoriser.user_key,
			JSON.stringify(userData)
		);
	}
	//
	// Create the sections from the identified fieldsets in the html
	get_sections(): mymap<section_id, section> {
		//
		//Collect all the identified fields
		const list: NodeListOf<Element> =
			this.document.querySelectorAll("fieldset[id]");
		//
		//Convert the nodelist to an array of elements; an array has more processing
		//options than a nodelist
		const elements: Array<Element> = Array.from(list);
		//
		//Map the elements to section_id/section pairs
		const pairs: Array<[section_id, section]> = elements.map(element =>
			this.create_section(element)
		);
		//
		//Use the pairs to create a map
		const collection = new mymap<section_id, section>("sections", pairs);

		//Return the map
		return collection;
	}

	//Use the identified fieldset element to create a section
	create_section(fieldset: Element): [id: section_id, section: section] {
		//
		//Get teh section id
		const id: string = fieldset.id;
		//
		//Create a section that matches the id of the fieldset
		let section: section;
		//
		switch (fieldset.id) {
			case "login":
				section = new login(fieldset, this);
				break;
			case "forgot":
				section = new forgot(fieldset, this);
				break;
			case "sign_up":
				section = new sign_up(fieldset, this);
				break;
			case "change":
				section = new change(fieldset, this);
				break;
			default:
				throw new mutall_error(`Section ${id} not known`);
		}
		//
		//We definitely know that id is indeed a section id
		return [<section_id>id, section];
	}
	//
	//Returns the current section by looking up the the one that is_current
	get section(): section {
		//
		// Find the section that corresponds to the selected operation
		const section: section | undefined = Array.from(
			this.sections!.values()
		).find(sect => sect.is_current);
		//
		// If the section is not found, throw an error
		if (!section) {
			throw new mutall_error("Section not found");
		}
		//
		return section;
	}
	//
	// Method to get all sections except the current one
	get other_sections(): Array<section> {
		// Find all sections that are NOT current
		const other_sections: Array<section> = Array.from(
			this.sections!.values()
		).filter(sect => !sect.is_current);

		return other_sections;
	}
	//
	// Clear all the erros in other sections
	clear_errors(): void {
		//
		// Clear all the errors in the other sections
		this.other_sections.forEach(sect => sect.clear_errors());
	}
	//
	// Get the user from the local storage

	//
	// Check if the user is already logged in and return the user
	get user_prop(): user | undefined {
		//
		//Check if the user is already logged in
		const stored_user = window.localStorage.getItem(authoriser.user_key);
		//
		// If the user is not logged in, return undefined
		if (!stored_user) return;
		//
		// Parse the user from the local storage
		const user_data = JSON.parse(stored_user);
		//
		// Create a user object from the user data
		return new user(user_data.name, user_data.pk);
	}

	//
	// Log out the user
	logout(): void {
		//
		// Clear the user from the local storage
		window.localStorage.removeItem(authoriser.user_key);
		//
		// Reload the page
		window.location.reload();
	}
	/*
	// Implementation of the abstract 'check' method required by quiz<user>
	async check(): Promise<boolean> {
		// Delegate validation to the current section
		return await this.section.check_inputs();
	}

	// Implementation of the abstract 'get_result' method required by quiz<user>
	async get_result(): Promise<user | undefined> {
		return this.user_prop;
	}

	async show_panels(): Promise<void> {
		this.set_sections();
	}
*/
	//
	//Since for the registration form we have no values to fill on the form do nothing
	async populate(): Promise<void> {}
	//
	//Read values from the form
	async read(): Promise<Error | null | undefined> {
		return;
	}
	//
	//Proceed to do the authentification requested by the user
	async execute(input: undefined): Promise<"Ok" | Error> {
		return "Ok";
	}
}
//
// Base abstract class for all sections of the authoriser page
// A section is the area/part that we collect/create and process user inputs from
//It is the paremnt of ios
export abstract class section extends io_parent {
	//
	// An array of ios that are the inputs of the section
	public ios: mymap<string, io>;
	//
	//Shows if the section is current or not. We look at the input field named choice
	//for each section. If checked, then it is the current
	public get is_current(): boolean {
		//
		//Get the input element named choice
		const input: HTMLInputElement | null = this.fieldset.querySelector(
			'input[name="choice"]'
		);
		//
		//It is an error if none is found
		if (!input)
			throw new mutall_error(`Input element named choice is not found`);
		//
		//The checked satatus of the element determines the result
		return input.checked;
	}

	//The name io is in all the sections
	public name: io;

	// Fieldset is the html element that contains the inputs of the section
	constructor(public fieldset: Element, parent: view) {
		super(parent);
		//
		//Create the ios of this section
		this.ios = this.create_ios();
		//
		this.name = this.ios.get("name");
	}

	//Check inputs and return true if all the inputs are ok
	async check_inputs(): Promise<boolean> {
		//
		//Assume all the inputs are ok
		let ok: boolean = true;
		//
		//Loop thru all the ios and verify each one of them is ok. If any of them is
		//not ok, then set ok to false

		for (const Io of this.ios.values()) {
			//
			//For future use, package the following check as a method of io
			//
			//Tell us if the io is required or not. If not, skip the rest of the test
			//Ensure that requred is one of the io_options and read its status from
			//the current HTML for every input
			if (!Io.search_option("required")) continue;
			//
			//The io value is required: check that it is not not null. If it is not null
			// then discontinue
			if (Io.value) continue;

			//
			//A required value is  null. Report the error
			//
			//Formuate the error message. Get the label of the io. You must have supplied
			//it as an option when creating the io
			const caption: string | undefined = Io.search_option("caption");
			//
			//If an io does not have a label, the use the name of the io as the label.
			//Every io must have a name, read from the HTML input element
			const name: string | undefined = Io.name;
			//
			//Formuate the error message. Use the name of the io, if teh label is not
			//available
			const msg: string = `${caption ?? name} is required`;
			//
			//Display the error message at neatest to the io
			Io.report_error(msg);
			//
			//Flag this error, so that not all inputs are ok
			ok = false;
		}
		//
		return ok;
	}
	//
	//Return the authorised user, or undefined if authorisation fails;
	async authorise(): Promise<user | undefined> {
		//
		//Discontinue the  authorisation if the inputs have errors. The reporting
		//is done as close to teh error source as possible
		if (!this.check_inputs()) return;
		//
		//Use the username to fetch user details from the registration database
		// -- mutall_user;
		const user: user_interface | undefined = await this.get_user(
			this.name.value
		);
		//
		//Check the user. Discontinue if invalid
		if (!this.check_user(user)) return undefined;
		//
		//Now do the real authentication
		return await this.authenticate(user);
	}

	//The default version. Override this behavior for login
	check_user(user: user_interface | undefined): boolean {
		//
		//If the user does not exist, report and discontinue
		if (user) return true;
		//
		//The user does not exist. Report and return false
		this.name.report_error("User does not exist");
		return false;
	}
	//
	//The process of authentication
	abstract authenticate(
		user: user_interface | undefined
	): Promise<user | undefined>;
	//
	// Collect the inputs as ios indexed by the input field name
	create_ios(): mymap<string, io> {
		//
		// Get all the io types in the this section. They are marked with data-io_type
		//attribute
		const nodes: NodeListOf<Element> =
			this.fieldset.querySelectorAll("*[data-io_key]");
		//
		//Its easier to work with an array than a node list. Each node is a proxy to
		// an io
		const proxies: Array<Element> = Array.from(nodes);
		//
		//Convert the proxies to named ios
		const ios: Array<[string, io]> = proxies.map(proxy =>
			this.parse(proxy)
		);
		//
		// Render each io
		ios.forEach(async ([name, io]) => await io.render());
		//
		//Use the named ios to create the desired map of ios
		const map = new mymap<string, io>("io", ios);
		//
		//Return the map
		return map;
	}

	//
	// Get the user from the database
	async get_user(name: basic_value): Promise<user_interface | undefined> {
		//
		if (!name) return;
		//
		//query to get their name,password and email
		const sql = `
        SELECT 
          user.user, 
          user.name, 
          user.password, 
          user.email 
        FROM 
          user 
        WHERE name = '${name}'`;
		//
		//Execute the query
		const user: Array<user_interface> = await this.exec_php(
			"database",
			["mutall_users", false],
			"get_sql_data",
			[sql]
		);
		//
		//return a user
		return user[0];
	}
	//
	// Clear all the errors in the section
	clear_errors(): void {
		//
		//Clear all the errors in the ios
		this.ios.forEach(io => io.report_error(""));
	}
}

// Login section implementation
export class login extends section {
	//
	public password: io;
	//
	constructor(fieldset: Element, parent: view) {
		super(fieldset, parent);
		//
		this.password = this.ios.get("password");
	}

	//
	//Authorise the user to login
	async authenticate(curr_user: user_interface): Promise<user | undefined> {
		//
		//The user exist. Match passwords;
		const isPasswordVerified: boolean = await this.exec_php(
			"mutall",
			[],
			"password_verify",
			[<string>this.password.value, curr_user.password]
		);
		//
		//If the passwords do not match, report so and discontinue
		if (!isPasswordVerified) {
			this.password.report_error("Password is incorrect");
			return;
		}
		//
		//Compile and return the user
		const name = <string>this.name.value;
		/*
        pk: number, 
        parent?: view, 
        options?: options
        */
		const User: user = new user(name, curr_user.user, this);
		//
		return User;
	}
}

export class sign_up extends section {
	//
	// The user name, password, confirm password and email required to sign up a new user
	public password: io;
	public confirm_password: io;
	//
	//For password reccoverly purposes
	public email: io;
	//
	constructor(fieldset: Element, parent: view) {
		super(fieldset, parent);
		//
		this.password = this.ios.get("password");
		this.confirm_password = this.ios.get("confirm_password");
		this.email = this.ios.get("email");
	}
	//
	async check_inputs(): Promise<boolean> {
		//
		//Check the required inpus
		if (!(await super.check_inputs())) return false;
		//
		// check if the new password and the confirm password match
		if (this.password.value !== this.confirm_password.value) {
			this.confirm_password.report_error("Passwords do not match");
			this.password.report_error("Passwords do not match");
			return false;
		}
		return true;
	}

	//The default version. Override this behavior for login
	check_user(user: user_interface | undefined): boolean {
		//
		//If the user does not exist, thats ok; discontinueteh check
		if (!user) return true;
		//
		//The user already exist
		this.name.report_error("User is already registered");
		return false;
	}

	//
	//Authorise the user to sign up
	async authenticate(curr_user: user_interface): Promise<user | undefined> {
		//
		//Hash the password before storing it
		const hashed_password = await this.exec_php(
			"mutall",
			[],
			"password_hash",
			[this.password.value]
		);
		//
		//Create a layout with the new users information
		const layout: Array<layout> = [
			[hashed_password, "user", "password"],
			[this.name.value, "user", "name"],
			[this.email.value, "user", "email"],
		];
		//
		//Save the new user to the database suing the exec method
		const response = await super.exec_php(
			"questionnaire",
			["mutall_users"],
			"load_common",
			[layout]
		);
		//
		// if the response is not successful, report so
		if (response !== "ok") {
			this.name.report_error("User not saved");
			return;
		}
		//
		// return the user
		//
		// get the new created user
		const new_user = await this.get_user(this.name.value);
		//
		//If the user does not exist, report and discontinue
		if (!new_user) {
			this.name.report_error("User registration failed");
			return;
		}
		//
		//Create a new user object
		const cur_user = new user(new_user.name, new_user.user);
		return cur_user;
	}
}

export class change extends section {
	//
	// The user name, old password, new password and confirm password required to change the password
	public old_password: io;
	public confirm_password: io;
	public new_password: io;
	//
	constructor(fieldset: Element, parent: view) {
		super(fieldset, parent);
		//
		this.new_password = this.ios.get("new_password");
		this.confirm_password = this.ios.get("confirm_password");
		this.old_password = this.ios.get("old_password");
	}

	async check_inputs(): Promise<boolean> {
		//
		//Do the default io checks
		if (!(await this.check_inputs())) return false;
		//
		// check if the new password and the confirm password match
		if (this.new_password.value !== this.confirm_password.value) {
			this.confirm_password.report_error("Passwords do not match");
			this.new_password.report_error("Passwords do not match");
			return false;
		}
		//
		return true;
	}

	//
	//Authorise the user to change their password
	async authenticate(curr_user: user_interface): Promise<user | undefined> {
		//
		//check if current user is valid
		//
		// check if the old password matches the password in the database
		const isPasswordVerified: boolean = await this.exec_php(
			"mutall",
			[],
			"password_verify",
			[<string>this.old_password.value, curr_user.password]
		);
		//
		//If the passwords do not match, report so and discontinue
		if (!isPasswordVerified) {
			this.old_password.report_error("Password is incorrect");
			return;
		}
		//
		// update the password
		//
		//Hash the password before storing it
		const hashed_password = await this.exec_php(
			"mutall",
			[],
			"password_hash",
			[this.new_password.value]
		);
		//
		//Save the new password to the database
		const layout: Array<layout> = [
			[hashed_password, "user", "password"],
			[this.name.value, "user", "name"],
		];
		//
		//Save the new password to the db using the exec method
		await super.exec_php("questionnaire", ["mutall_users"], "load_common", [
			layout,
		]);
		//
		// Notify the user the password has been changed
		//
		// Return the user
		const new_user = new user(curr_user.name, curr_user.user);
		return new_user;
	}
}

export class forgot extends section {
	//
	constructor(fieldset: Element, parent: view) {
		super(fieldset, parent);
	}
	//
	//Authorise the user to recover their password
	async authenticate(curr_user: user_interface): Promise<user | undefined> {
		//
		// Generate a new password
		const password: string = await this.generate_new_password(curr_user);
		//
		// Send the new password to the user's email
		const result: "ok" | Error = await this.email_password(
			password,
			curr_user
		);
		//
		//Kill teh system if the emial was nt sent
		if (result !== "ok") throw new mutall_error(result.message);
		//
		//Alert the user that the password is in the mail.
		myalert("See your new password in your email");
		//
		//return withou a user
		return undefined;
	}
	//
	// Generate a simple new password for the user, hash t and  save it to the databaenase
	async generate_new_password(curr_user: user_interface): Promise<string> {
		//
		// Generate a new password
		const password = this.construct_password();
		//
		//Hash the password before storing it
		const hashed_password = await this.exec_php(
			"mutall",
			[],
			"password_hash",
			[password]
		);
		//
		//Save the new password to the database
		const layout: Array<layout> = [
			[hashed_password, "user", "password"],
			[curr_user.name, "user", "name"],
		];
		//
		//Save the new password to the db using the exec method
		const result: "ok" | string = await this.exec_php(
			"questionnaire",
			["mutall_users"],
			"load_common",
			[layout]
		);
		//
		//Error occured when saving; kill this proces, so the error can be investigated
		if (!result) throw new mutall_error(result);
		//
		//Return the new password
		return password;
	}
	//
	//Construct a password
	construct_password(length: number = 12): string {
		//
		// Define the characters that we will use to generate the password
		const chars =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+=<>?";
		//
		//Start with an empty password
		let password = "";
		//
		// Generate the password by selecting a random character from the chars
		for (let i = 0; i < length; i++) {
			//
			// Generate a random index
			const randomIndex = Math.floor(Math.random() * chars.length);
			//
			// Append the random character to the password
			password += chars[randomIndex];
		}
		//
		//Return the paswword
		return password;
	}
	//
	// Send the new password to the user's email
	async email_password(
		password: string,
		curr_user: user_interface
	): Promise<"ok" | Error> {
		//
		// Get the email of the user
		const email = curr_user.email;
		//
		//The subject is about recovery
		const subject: string = "Password recovery";
		//
		//The body is the password itself
		const body: string = `Dear ${curr_user.name},  your new password is ${password}`;
		//
		const result: "ok" | string = await this.exec_php(
			//
			//To resolve the following error, update the library.d.ts with the
			// mutall_mailer class and install php mailer on this machine
			"mutall_mailer",
			[],
			"send_email",
			[email, subject, body, "Mutall Data"]
		);
		//
		return result === "ok" ? "ok" : new Error(result);
	}
}
