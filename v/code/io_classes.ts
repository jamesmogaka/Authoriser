import {
    basic_value,
    column,
    view,
} from '../../../schema/v/code/schema';
import {table_option_interface} from "../../../outlook/v/zone/zone.js";
//
//Type of input element 
export type input_type = 'date'|'text'|'number';
//
//The anchor of the io element is a combination of the html element where the io resides and the
//parent of the io in terms of which class was this io created under
type anchor = {
    //
    //The html element where the io resides
    element: HTMLElement;
    //
    //The parent of the io in terms of which class was this io created under
    parent: view;
};
//
//This is the requried infromation for you to create an io.
export interface io_option_interface extends table_option_interface {
    //
    //This are the labels that are user friendly and self explanatory and are to displayed before
    //the input element to guid the user on what data to enter to the io.
    caption: string;
    //
    //This is an identifier that is used to retrieve the entire io from the document
    id: string;
    //
    //Prevents interaction or form submission with the input
    disabled: boolean;
    //
    //Is the value optional or mandatory
    required: boolean;
    //
    //This type of identifier is essntial when passing the data from the io to a remote server.
    //The name given to the input elements are normaly the keys used to access the value at the
    //$_POST global variable
    name: string;
}
//
export type io_options = Partial<io_option_interface>;
//
//The class to organize our input and output
export abstract class io extends view {
    //
    //The visual representation of the io
    public get proxy(): HTMLElement{return this.proxy__};
    //
    //The error reporting section of the io
    private error?: HTMLSpanElement;
    //
    //The output element that shows the value of the io in normal mode
    protected output?: HTMLOutputElement;
    //
    //The database column to be associated with this particular io
    public col?: column;
    //
    //At the io level we can either get or set values form the specific io
    abstract get value(): basic_value;
    abstract set value(input: basic_value);
    //
    //This will handel the basic check of the specific io.
    //TODO:Is this really necessary???
    abstract check(): boolean;
    //
    //Each io must be able to co-ordinate the display of each of its element depending on the display
    //mode
    abstract render_elements(mode: 'normal' | 'edit'): void;
    //
    //Redfine options of an io to be more accurate then just view_options
    declare options:io_options;
    public proxy__:HTMLElement;
    //
    constructor(
        //
        //Where this io is anchored on the parennt view
        anchor: anchor,
        //
        //User defined options to influence the io
        options?: io_options,
        //
        //The initial value
        public init_value?:basic_value
    ) {
        //
        //Initialize the view
        super(anchor.parent, options);
        //
         //Get the proxy from the anchor
         this.proxy__ = anchor.element;
    }
    //
    //Handle the creation and preparation of the elements of the io before showing them on the
    //specified anchor if any
    public async render(): Promise<void> {
        //
        //Use the avilable metadata to set the db column. The db column will help us get the required
        //information for formulating the io
        this.col = await this.set_column();
        //
        //Create the output element.This element will show the value of the io in normal mode
        this.output = this.create_element('output', <HTMLElement>this.proxy);
        //
        //Create the section that will be used for targeted error reporting
        this.error = this.create_element('span', <HTMLElement>this.proxy, {
            className: 'error',
        });
    }
    //
    //Using the options provided by the user try to get a database column to be associated with this
    //particular io. This is important since most of the details to render the io could be extracted
    //straight form the database. The database coulumn is also important when tryng to save content
    //from the io to the database.
    private async set_column(): Promise<column | undefined> {
        //
        //We cannot establish the database column to associate whith this io if no options were provided
        if (!this.options) return;
        //
        //Destructure the metadata to get the labels associated with this particular io
        const { labels } = this.options;
        //
        //If no labels were provided do not continue with this process of seting the db column
        if (!labels || labels.length === 0) return;
        //
        //The stucture of the subject destructure the subject
        //TODO:Think of how to handle the possibility of multiple labels
        const [, ename, cname, dbname] = labels[0];
        //
        //Use the subject info to produce a db column
        return await this.get_column(ename, cname, dbname);
    }
    //
    //Create the label element that will house the specific elements to be associated by an io
    private async label_create(): Promise<HTMLLabelElement> {
        //
        //Create a label element attached at the most appropriate section ( depending on infomation
        //given)
        const label: HTMLLabelElement = this.create_element('label', this.proxy);
        //
        //TODO: Add the data-subject and data-id to the label element
        //
        //A custom identification attribute tat could be used to retrieve this particular io
        if (this.options?.id) label.setAttribute('data-id', this.options.id);
        //
        //Look for the user friendly label amongest the options provided. If it is not explicitly
        //given use the other metadata to try and deduce the most sensible annotation for the given
        //io
        const caption: string | undefined = await this.label_get_caption();
        //
        //Create the span to hold the friendly label
        //TODO:Investigate why innerHTML is interpreated as an attribute when you assign undefined
        this.create_element('span', label, {
            textContent: caption ? `${caption.toUpperCase()}: ` : '',
        });
        //
        //Since the label will be the proxy of the io return it for saving
        return label;
    }
    //
    //Check the provided options for the user friendly label that will be appended next to the
    //input element in the label. If the friendly option is not provided use other additional
    //options to provide an appropriate friendly label from the io
    private async label_get_caption(): Promise<string | undefined> {
        //
        //There is nothing to do if the options lack hence discontinue the process
        if (!this.options) return;
        //
        //Check the option to see if the friendly label was provided
        if (this.options.caption) return this.options.caption;
        //
        //When we get here we know that the friendly label was not provided by the user
        //so look through the rest of the metadata provided to deduce a suitable label to use
        //
        //With a db column we could try and get information stored at the column level
        //such as the comment or possibly the column name.
        if (this.col) return this.col.comment ?? this.col.name;
        //
        //If the subject is not there use the specified id or name
        return this.options.id ?? this.options.name;
    }
    //
    //Custom helper method to help easen the process of reporting errors for each io. Incase the io
    //does not have an error reporting section create it and report the error
    public report_error(message: string): void {
        //
        //If no io element exist discontinue the process
        if (!this.proxy) return;
        //
        //If the error reporting section is not there create it
        if (!this.error)
            this.error = this.create_element('span', this.proxy, {
                className: 'error',
            });
        //
        //Report the error in the designated error reporting section
        this.error.textContent = message;
    }
    //
    //Helper method to clear errors
    public clear_error(): void {
        //
        //If there is no error reporting section do nothing
        if (!this.error) return;
        //
        //Otherwise clear the error
        this.error.textContent = '';
    }
    //
    //This helper method will be used to ensure that the input and output elements of the io are
    //in sync
    public update_output(): void {
        //
        //If no io element exist discontinue the process
        if (!this.proxy) return;
        //
        //If there is no output element do nothing
        if (!this.output) this.output = this.create_element('output', this.proxy);
        //
        //Otherwise update the output element
        this.output.textContent = String(this.value);
    }
    //
    //Get the relevant information to signify if an io is optional or mandatory
    public async is_required(): Promise<boolean> {
        //
        //Extract from the options the information if a particular column is requried or not.
        const required: boolean | undefined = this.options?.required;
        //
        //Confirm from the metadata provided if the given input is required or mandatory
        if (required) return required;
        //
        //If that information was not provided we have to deduce it from the database column
        if (this.col) return this.col.is_nullable === 'YES' ? false : true;
        //
        //The default is to make that field optional
        return false;
    }
    //
    //Use the metadata to try and produce the most sensible name that will be useful in uploding of
    //the data to the server
    protected async get_name(): Promise<string | undefined> {
        //
        //Destructure the Options using safe destructuring
        const { name, id } = this.options || {};
        //
        //If the name is provided use it as it is
        if (name) return name;
        //
        //use the column name if the name is not present
        if (this.col) return this.col.name;
        //
        //The id could also be used if none of the above was found
        if (id) return id;
        //
        //If none of the above was provided return nothing
        return;
    }
}
//
//Implement a text input to handle all input output operations using a html input element
export class input extends io {
    //
    //The native html input element that will be used fro data entry / input operations
    public input?: HTMLInputElement;
    //
    //Reading the current value of the io
    get value(): basic_value {
        //
        //TODO: If the input is not present return a null ????
        if (!this.input) return null;
        //
        //Read the value from the input element
        const value: basic_value = this.input.value.trim();
        //
        //Return the value that was read from the input and ensure that all the empty strings
        //are converted to nulls
        return value === '' ? null : value;
    }
    //
    //Set the value of the io if you have an alredy predefined value when creating the io
    set value(input: basic_value) {
        //
        //If the input provided is a null then do nothing
        if (!input) return;
        //
        //If there is no input element do nothing
        if (!this.input) return;
        //
        //Reflect the value given to the input element
        this.input.value = String(input);
        //
        //Update the output element to match the new value
        this.update_output();
    }
    //
    constructor(
        //
        //The parent view of this io
        anchor: anchor,
        //
        //User defined options to influence the io
        options: io_options,
        //
        //The initial value
        init_value?:basic_value,
        //
        //The type of input element
        public input_type?:input_type,
        //
        //The Physical length and number of characters a text input could allow
        public length?: number
    ) {
        //
        super(anchor, options, init_value);
    }
    //
    //Override the rendering of the io to complete the creation of the input element and also add
    //the events listeners and relevant attributes to the input element getting it ready for use.
    async render(): Promise<void> {
        //
        //Ensure that the aspects of the io that are to be taken care at the io level are done
        //The parent will create the proxy of the io which will house the various elements in the io
        await super.render();
        //
        //Create the input element That will facilitate data collection in this io
        this.input = this.document.createElement('input');
        //
        //Create the specified type of input by default the input is a basic text input
        this.input.type = this.input_type??'text';
        //
        //Indicate if the data is mandatory or optional
        if (await this.is_required()) this.input.required = true;
        //
        //Display the maxlength and size of the input element
        //TODO:The business of getting the length is only relevant in input of type text
        //
        //Get the length
        const length: number | undefined = await this.get_length();
        //
        //We only set the length if something is available
        if (length) {
            //
            //maxlength of characters the input element will allow to be typed by the user
            this.input.maxLength = length;
            //
            //physical size of the input element
            this.input.size = length;
        }
        //
        //finally set the approprite name to the input element
        this.input.name = (await this.get_name()) ? ((await this.get_name()) as string) : '';
        //
        //Get the mode for rendering
        const mode: 'edit' | 'normal' | undefined = this.options?.mode;
        //
        //Render the io in the either edit or normal
        mode === undefined ? this.render_elements() : this.render_elements(mode);
        //
        //Add all appropriate event listeners to each element in the io
        this.add_listeners();
        //
        //If an initial value was provided update the input and output to reflect the value provied
        if (this.init_value) this.value = this.init_value;
        //
        //Insert the input element just before the output element
        this.proxy.insertBefore(this.input, this.output!);
    }
    //
    //Add the event listeners to the variouse components of the io to ensure expected behaviour
    add_listeners(): void {
        //
        //Ensure that by clicking on the proxy we are able to switch between edit and normal mode
        //TODO :We should also ensure that if the io is clicked the focus goes to the input elementd
        this.proxy?.addEventListener('click', () => this.toggle_mode());
        //
        //Prevent click event propagation at the input level. Without preventing the clicks on the
        //proxy or input will be duplicates
        this.input?.addEventListener('click', (event) => event.stopPropagation());
        //
        //Whenever the user looses focus check the input value and proceed to process the information
        //entered if valid
        //TODO: We also need to switch back to normal mode
        this.input?.addEventListener('blur', () => this.onblur());
        //
        //Finally we want to clear the errors and store the data whenever a user is inputing
        this.input?.addEventListener('input', () => this.clear_error());
    }
    //
    //Toggle the elements depending on the display mode once we click on the io
    toggle_mode(): void {
        //
        //Get the mode for rendering
        const mode: 'edit' | 'normal' | undefined = this.options?.mode;
        //
        //Render the io in the either edit or normal
        if (mode === undefined) {
            //
            //Render on the default (normal mode)
            this.render_elements();
            //
            //Update the mode in preparation for the next time ????
            this.options!.mode = 'normal';
        } else {
            //
            //Render in the specified mode
            this.render_elements(mode);
            //
            //Update the mode in preparation for the next time
            this.options!.mode = mode === 'edit' ? 'normal' : 'edit';
        }
    }
    //
    //We need to take care of what happens whenever the user looses focus
    //TODO: For now i will use this to produce an error message if the io is mandatory and
    //the user provided nothing
    //We should use this to check the input and even do things like saving the data to the
    //dbase if we have complete infromation
    onblur(): void {
        //
        //Update the output with the new value
        this.update_output();
        //
        //Check the io to ensure that quality data was provide
        const result: boolean = this.check();
        //
        //If the test passe toggle to display mode
        if (result) this.toggle_mode();
    }
    //
    //Get the maximum length of characters a particular input could accomodate. This value is either
    //Provided explicitly via the options used to create this io or we could infer the most suitable
    //length from the database. In the column we mostly have length constraints in columns with
    //the data type of varchar
    protected async get_length(): Promise<number | undefined> {
        //
        //If the length was explicitly provided by the user in the options return it as is
        if (this.length!==undefined) return this.length;
        //
        //Use the elements default settings if the length was not provided and we do not have a column
        if (!this.col) return undefined;
        //
        //When we get here we have to deduce the length from the dbase column since the value was
        //not explicitly given. We only get the size of the column for text and varchar cases
        return this.col.data_type === 'varchar' || this.col.data_type === 'text'
            ? this.col.length
            : undefined;
    }
    //
    //Do relevant checks on the io. e.g, If the io is marked as required ensure that the user fills
    //the io.
    //If the io does not pass the checks report the relevant error and return a false for the user to
    //decide on weather to proceed with the process or not
    check(): boolean {
        //
        //get the value of the io
        const value: basic_value = this.value;
        //
        //If the value is null and the io is required report the error and return false
        if (value === null && this.options?.required) {
            this.report_error('This field is required, please fill it');
            return false;
        }
        //
        //The io passed the check
        return true;
    }
    //
    //Determine depending on the display mode which elements are supposed to be visible and
    //which elements should be hidden
    render_elements(mode: 'normal' | 'edit' = 'normal'): void {
        //
        //Ensure that the input and output elements are hidden
        this.input?.classList.add('hidden');
        this.output?.classList.add('hidden');
        //
        //Depending on the mode show the relevant elements
        switch (mode) {
            //
            //In display mode show the output element
            case 'normal':
                this.output?.classList.remove('hidden');
                break;
            //
            //In edit mode show the input element
            case 'edit':
                this.input?.classList.remove('hidden');
                break;
        }
    }
}
//
//The text area class is an io extension of a simple input to allow
//us to capture large amounts of text in an expandable box.
export class textarea extends input {
    //
    //The native textarea element.
    public textarea?: HTMLTextAreaElement;
    //
    //Set the value of the io if you have an alredy predefined value when creating the io
    set value(input: string) {
        //
        //If the input has more than 50 characters the value is set on the text area
        if (input.length > 50) this.textarea!.value = input;
        //
        //Reflect the value given to the input element
        this.input!.value = input;
        //
        //Update the output element to match the new value
        this.update_output();
    }
    //
    constructor(
        //
        //The parent view of this io
        anchor: anchor,
        //
        //User defined options to influence the io
        options: io_options,
        //
        //The initial value
        public init_value?:basic_value,
        //
        //The width of the text area for typing
        public width?:number,
        //
        //The Physical length and number of characters a text input could allow
        length?: number,
    ) {
        //
        //Create an instance of the text input
        super(anchor, options, init_value, 'text', length);
    }
    //
    //
    //Create the textarea element that will be used by this instance for data collection
    //Since the text area is an extension of the input of type text we need to have two native elements
    //that will be used for data collection, the text input and the textarea element. We will show the
    //input until the user has enterd more than 50 characters and if the user still continues typing
    //we will have to switch to a text area now. THis means that whatever the input is able to do
    //the textarea should do. The text input will be created by the input and this class will have
    //to provide a textarea that works just like the textarea
    async render(): Promise<void> {
        //
        //Ensure that the aspects of the io that are to be taken care at the io level are done
        //The parent will create the proxy of the io which will house the various elements in the io
        await super.render();
        //
        //Finalize the setup of the text area element that will be used in conjunction with the
        //input element
        await this.create_textarea();
    }
    //
    //Finalize setting up of the text area. Since a text area is an extension of the text input
    //ensure that all the attributes that are in the input are also in the text area because we will
    //be switching between the two depending on the number of characters enterd
    async create_textarea(): Promise<void> {
        //
        //Create the Text area element that will be used for data collection
        this.textarea = this.document.createElement('textarea');
        //
        //Indicate if the data is mandatory or optional
        if (await this.is_required()) this.textarea.required = true;
        //
        //Get the length
        const length: number | undefined = await this.get_length();
        //
        //set the Maximum number of characters the textarea element will allow to be typed by the user
        //only if the length was specified or deduced from the database column
        if (length) this.textarea.maxLength = length;
        //
        //Insert the text area element just before the output element
        this.proxy?.insertBefore(this.textarea, this.output!);
        //
        //Attach the relevant eventlisteners to the textarea element
        //
        //On blur we need to transfer the value from the text area to the input element
        this.textarea.addEventListener('blur', () => this.activate_input());
        //
        //On input we need to clear the error message
        this.textarea.addEventListener('input', () => {
            this.clear_error();
        });
        //
        //Prevent click event propagation at the input level. Without preventing the clicks on the
        //proxy or input will be duplicates
        this.textarea?.addEventListener('click', (event) => event.stopPropagation());
        //
        //Ensure the text area is activated once we have entered 5o characters long
        this.input?.addEventListener('input', () => {
            //
            //If the input has more than 50 characters activate the text area
            if (this.value.length > 50) this.activate_textarea();
        });
    }
    //
    //This is an onblur event listener of the textarea,
    //that updates the editted value to that of the input.
    //It triggers the input`s onchange event so that the input can behave normally.
    public activate_input() {
        //
        //Transfer the textarea content to the input value. Textext area content
        //can be null. input.value is always a string; hence....
        this.value = this.textarea!.value;
        //
        //Rendeer the io in normal mode
        this.render_elements('normal');
    }
    //
    //This is an onclick event listener (of the input element) that activates
    //the textarea for the user to start editing.
    public activate_textarea() {
        //
        //Transfer the input value to the textarea text content
        this.textarea!.value = this.input!.value;
        //
        //Render the io in edit mode
        this.render_elements('edit');
        //
        //Transfer focus to the text area
        this.textarea!.focus();
    }
    //
    //This is autility that could be used to control the rendered elements at any point.
    //When the io is in normal/display mode we need to render the output element. When in edit mode
    //we have the input and the text area element to coordinate. We need to show the input element
    //only for the first 50 characters after which we then show the text area.
    render_elements(mode: 'normal' | 'edit'): void {
        //
        //Hide everything
        this.textarea?.classList.add('hidden');
        this.input?.classList.add('hidden');
        this.output?.classList.add('hidden');
        //
        //Since everything is hidden we now need to chek if we are in edit or normal mode and show
        //the appropriate element
        if (mode !== 'edit') {
            //
            //Show the output element since we are in the normal mode
            this.output?.classList.toggle('hidden');
            //
            //Exit since there is nothing else to be done
            return;
        }
        //
        //Once we get here we know we are in edit mode and we need to decide which element to show
        //depending on the number of characters entered by the user
        //
        //Incase the value is empty show the text input
        if (!this.value) {
            //
            //Show the input element
            this.input?.classList.remove('hidden');
            //
            //Exit since there is nothing else to be done
            return;
        }
        //
        //Get the lengh of the entered string
        const length: number = this.value.toString().length;
        //
        //If the number of characters entered is less than 50 we show the input element otherwise
        //we will show the text area
        if (length < 50) this.input?.classList.remove('hidden');
        else this.textarea?.classList.remove('hidden');
    }
}
