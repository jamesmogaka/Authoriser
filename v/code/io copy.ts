import {
    basic_value,
    column,
    mutall_error,
    view,
    view_options,
    view_option_interface,
} from '../../../schema/v/code/schema';
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
export interface io_option_interface extends view_option_interface {
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
//This is the data required to plot a simple text input.
export type text = {
    type: 'text';
    //
    //The Physical length and number of characters a text input could allow
    length?: number;
    //
    //To add a datalist that will be associated with the given input for autocomplete sugesstions
    list?: Array<basic_value>;
};
//
//A number input
//The name int was forced since number is alredy a javascript keyword
export type int = {
    type: 'number';
    //
    //When dealing with input of type number we have the option to specify a range in which we
    //can collect the numbers from
    //
    //Upper bound of the range
    max?: number;
    //
    //The lower bound of the range
    min?: number;
};
//
//Date ,datetime and a time inputs all have simmilar attributes. The only difference is in the format
//of the values one supplies
//In the case of a date the value supplied for the max, min and value should be a string of the format
//YYYY-MM-DD
//If the input is of type datetime-local the format for the string supplied is YYYY-MM-DDTHH:MM:SS.sss
//whereby the seconds and mili seconds are optional
//
//Finnaly for time the format of the string is HH:MM:SS
export type date_time = {
    type: 'date' | 'datetime-local' | 'time';
    //
    //The earliest selectable date in the input field
    min?: string;
    //
    //Defines the latest selectable date
    max?: string;
};
//
//THis are the various elements which are to be used to model choices.
export type choice = {
    type: 'select' | 'checkbox' | 'radio';
    //
    //The list of options that can be selected
    options: Array<basic_value>;
    //
    //Indicates whether the user can select multiple options
    multiple: boolean;
};
//
//TODO: choice
//
//We will use an intersection type in ts to express the fact that all io_types share some common
//attributes among themselves and use a discriminant union to express the differences in the individual
//ios
//TODO: Evaluate if the utility type to extract all discriminants will break down in the case bellow
//The bit am not suer is how the discriminant_key utility type will handle this
export type io_type = {
    //
    //The initial value of the io
    value?: basic_value;
} & (
    | text
    | int
    | date_time
    | choice
    | {
          type: 'color' | 'range' | 'email' | 'password' | 'hidden';
      }
);

/*
    //
    //The structure of a simple io element
    <label data-io_type= ${io_type.type} data-id=${id}>
        <span>${caption}</span>

        <input 
            type=${io_type.type} 
            required=${required} 
            disabled=${disabled} 
            name=${name} 
            maxlength=${$io_type.length}
            size=${$io_type.length}
        />

        <span class="error"></span>
    </label>
*/
//
//The class to organize our input and output
abstract class io extends view {
    //
    //The visual representation of the io
    public io?: HTMLLabelElement;
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
    //This function will handel the basic check of the specific io.
    //TODO:Is this really necessary???
    abstract check(): boolean;
    //
    //Each io must be able to co-ordinate the display of each of its element depending on the display
    //mode
    abstract render_elements(mode: 'normal' | 'edit'): void;
    //
    constructor(
        //
        //User defined options to influence the io
        public options?: io_option_interface,
        //
        //The parent view of this io
        public anchor?: Partial<anchor>
    ) {
        //
        //The options to influence a view
        //I dont know how to split the view options from the io options
        const view_options: view_options = {};
        //
        //Initialize the view
        super(anchor?.parent, view_options);
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
        //Create the label that will house the individual components that make up the io
        this.io = await this.label_create();
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
        //Destructure the anchor to get its individual components
        const { element, parent } = this.anchor ?? {};
        //
        //Look for the anchor where the label is to be placed. Incase the anchor is not provided
        //we resort to the proxy of the parent otherwise the body of the current document
        const anchor: HTMLElement = element
            ? element
            : parent?.proxy
            ? <HTMLElement>parent.proxy
            : this.document.body;
        //
        //Create a label element attached at the most appropriate section ( depending on infomation
        //given)
        const label: HTMLLabelElement = this.create_element('label', anchor);
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
        if (!this.io) return;
        //
        //If the error reporting section is not there create it
        if (!this.error)
            this.error = this.create_element('span', this.io, {
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
        if (!this.io) return;
        //
        //If there is no output element do nothing
        if (!this.output) this.output = this.create_element('output', this.io);
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
//To house the static procedures and properties of the io
namespace io {
    //
    //A factory method to create an io from a given html element. Provided we have the actual element
    //that is to be the proxy of the io. Try to collect the relevant information that will be used
    // to create io then create the io and ensure that we pass the relevant html elements to the
    // created io
    export function parse(element: HTMLLabelElement | io_type): io {
        //
        //Get the io type and use it to get io specification of the given element
        const io_type: io_type = get_io_type(element);
        //
        //Collect the options of the io
        const options: io_option_interface = collect_options(element);
        //
        //finally use the iotype and options collected above to create the relevant io
        return create_io(io_type, options, element);
    }
    //
    //Given an html element return the io type that is associated with it
    function get_io_type(element: HTMLLabelElement): io_type {
        //
        //Get the data type attribute of the element
        const data_iotype: string | null = element.getAttribute('data-io_type');
        //
        //If the data type is not specified throw an error
        if (!data_iotype)
            throw new mutall_error(`The io type is not specified for the given element`, element);
        //
        //Proceed to compile the io_type specification from the various attributes of the io element
        const io_type: io_type = compile_iotype(data_iotype, element);
        //
        //Return the io type
        return io_type;
    }
    //
    //This is to coordinate the process of collection of the various attributes depending on the io
    //type. We will also compile the attributes into a partial io type structure since we will be collecting
    //the io_type as we go along
    function compile_iotype(type: string, element: HTMLLabelElement): io_type {
        //
        //Depending on the indicated data_type on the io element generate the most appropriate query
        //selector to get the data collection element
        switch (type) {
            //
            //In the data-type text accoding to our text definition its an input of type text
            case 'text':
                return get_text(element);
            //
            //The int io is an input of type number
            case 'int':
                return get_int(element);
            //
            //The date_time could possibly be an input of either date, datetime or time
            case 'date_time':
                return get_datetime(element);
            //
            //A choice could either be a select, checkbox or a radio input
            case 'choice':
                return get_choice(element);
            //
            //IF We get to this point the type given is not in our various defined io types
            //alert the user
            default:
                throw new mutall_error(
                    `The type ${type} is not supported. Check the data-type attributes on your form!!`
                );
        }
    }
    //
    //Read the various attributes that are expected in a text io and compose a io_type of text.
    //A typical text io structure looks as follwos:-
    /* 
    {
        type: 'text';
        //
        //The Physical length and number of characters a text input could allow
        length: number;
        //
        //To add a datalist that will be associated with the given input for autocomplete sugesstions
        list?: Array<basic_value>;
    };
    */
    function get_text(element: HTMLElement): io_type {
        //
        //Get the html element that is used for data collection. We alerdy know that we are dealing
        //with simple text cases
        const input: HTMLInputElement | null = element.querySelector('input[type="text"]');
        //
        //A text input must be present since the io is a text io
        if (!input)
            throw new mutall_error(
                'You said its a text io and there is no input element present',
                element
            );
        //
        //The iotype to return
        const text: Partial<text> = {};
        //
        //The type of the input element
        text.type = 'text';
        //
        //The nmaximum nuber of characters that the given text input can have
        text.length = get_maxlength(input);
        //
        //Get datalists associated with the input if any
        text.list = get_datalist(input);
        //
        //Now compile the complete iotype
        const io_type: io_type = <io_type>text;
        //
        //Read the common attributes the value if present. For empty strings return undefined
        io_type.value = input.value ? input.value.trim() : undefined;
        //
        return io_type;
    }
    //
    //Get the datalist associated with the given input element if any
    function get_datalist(input: HTMLInputElement): Array<basic_value> | undefined {
        //
        //Get the datalist element associated with the input
        const datalist: HTMLDataListElement | null = input.list;
        //
        //If there is no datalist return undefined
        if (!datalist) return;
        //
        //Get the options of the datalist
        const options: Array<HTMLOptionElement> = Array.from(datalist.options);
        //
        //Map the options to their values
        const values: Array<basic_value> = options.map((option: HTMLOptionElement) => option.value);
        //
        //Return the values
        return values;
    }
    //
    //Get the length of a given text input by reading the size attribute and converting it into an
    //integer
    function get_maxlength(input: HTMLInputElement): number {
        //
        //Get the length attribute of the input
        const length: number | null = input.maxLength;
        //
        //If a length is present return it
        if (!length === null) return length;
        //
        //If the length is not present Alert the user of this problem
        throw new mutall_error('The length attribute is not present. Check the console!', input);
    }
    //
    //Read the various atttributes that are expected in a int io_type
    function get_int(element: HTMLElement): io_type {
        //
        //Get the html element that is used for data collection. We alerdy know that we are dealing
        //with simple text cases
        const input: HTMLInputElement | null = element.querySelector('input[type="number"]');
        //
        //A number input must be present since the io is a number io
        if (!input)
            throw new mutall_error(
                'You said its a number io and there is no input element present',
                element
            );
        //
        //The iotype to return
        const int: Partial<int> = {};
        //
        //The type of the input element
        int.type = 'number';
        //
        //Set the max and min of the int
        int.max = input.max ? parseInt(input.max) : undefined;
        int.min = input.min ? parseInt(input.min) : undefined;
        //
        //Now compile the complete iotype
        const io_type: io_type = <io_type>int;
        //
        //Read the common attributes the value if present. For empty strings return undefined
        io_type.value = input.value ? parseInt(input.value) : undefined;
        //
        //Return the iotype
        return io_type;
    }
    //
    //Read the various atttributes that are expected in a date_time io_type
    function get_datetime(element: HTMLElement): io_type {
        //
        //Get the html element that is used for data collection. We alerdy know that we are dealing
        //with simple text cases
        const input: HTMLInputElement | null = element.querySelector(
            'input[type="date"], input[type="datetime-local"], input[type="time"]'
        );
        //
        //A date input must be present since the io is a date io
        if (!input)
            throw new mutall_error(
                'You said its a date io and there is no input element present',
                element
            );
        //
        //The iotype to return
        const datetime: Partial<date_time> = {};
        //
        //The type of the input element
        datetime.type = 'date';
        //
        //Get the earliest selectable date/ time /datetime
        datetime.min = input.min ? input.min.trim() : undefined;
        //
        //Get the latest selectable date/ time /datetime
        datetime.max = input.max ? input.max.trim() : undefined;
        //
        //Now compile the complete iotype
        const io_type: io_type = <io_type>datetime;
        //
        //Read the common attributes the value if present. For empty strings return undefined
        io_type.value = input.value ? input.value.trim() : undefined;
        //
        //Return the iotype
        return io_type;
    }
    //
    //Read the attributes relevant in creating a choice io
    //NB:- For choices we are expecting possibly more thatn one input elements within this particular
    //io
    function get_choice(element: HTMLElement): io_type {
        //
        //Get all the choice elements in the current document
        const elements: Array<HTMLElement> = Array.from(
            element.querySelectorAll('input[type="radio"], input[type="checkbox"], select')
        );
        //
        //If there are no choice elements throw an error
        if (elements.length === 0)
            throw new mutall_error('No select, checkbox or radio element found in the io', element);
        //
        //Categorize the choice to either a select, checkbox or radio
        const type: 'select' | 'checkbox' | 'radio' = categorise_choice(elements);
        //
        //Since the choice io is either a single select element or one or more checkbox or radio
        //elements Use a case statement to handle that diversity
        switch (type) {
            //
            //Retrieve the relevant info from the select element
            case 'select':
                return get_select(elements);
            //
            //Retrieve the relevant info from the checkbox element
            case 'checkbox':
                return get_checkbox(elements);
            //
            //Retrieve the relevant info from the radio element
            case 'radio':
                return get_radio(elements);
        }
    }
    //
    //Depending on the collection of elements given categorise the choice io into one of 3 categories
    //1.select - If we find only one select element in the collection(No checkbox or radio button should
    // be found)
    //2.checkbox - If we find one or more checkboxes in the collection and no other radio or select
    //3.radio - If we find one or more radio buttons in the collection and no other checkbox or select
    function categorise_choice(collection: Array<HTMLElement>): 'select' | 'checkbox' | 'radio' {
        //
        // Categorize elements by type
        const selects: Array<HTMLElement> = collection.filter((el) => el.tagName === 'SELECT');
        const checkboxes: Array<HTMLElement> = collection.filter(
            (el) => el.tagName === 'INPUT' && el.getAttribute('type') === 'checkbox'
        );
        const radios: Array<HTMLElement> = collection.filter(
            (el) => el.tagName === 'INPUT' && el.getAttribute('type') === 'radio'
        );
        //
        //Now check for the various conditions
        //
        //
        if (selects.length === 1 && checkboxes.length === 0 && radios.length === 0) return 'select';
        else if (checkboxes.length > 0 && selects.length === 0 && radios.length === 0) ret;
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
        //The type of the io
        public io_type: io_type,
        //
        //User defined options to influence the io
        options?: io_option_interface,
        //
        //The parent view of this io
        anchor?: Partial<anchor>
    ) {
        //
        super(options, anchor);
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
        this.input.type = this.io_type.type;
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
        if (this.io_type.value) this.value = this.io_type.value;
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
        this.io?.addEventListener('click', () => this.toggle_mode());
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
    //TODO: For now i will use this function to produce an error message if the io is mandatory and
    //the user provided nothing
    //We should use this function to check the input and even do things like saving the data to the
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
        //Destructure the metadata to get the important bits for this work
        const { length } = <text>this.io_type;
        //
        //If the length was explicitly provided by the user in the options return it as is
        if (length) return length;
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
        //The specification of the io that is to be created. SInce the text area ia an extension of
        //text input ensure that the iotype is strictly text io
        io_type: text,
        //
        //Information that will be helpful in construction of the io
        options?: io_option_interface,
        //
        //This is information that helps us to know where an io belongs and is to be attached to
        anchor?: Partial<anchor>
    ) {
        //
        //Create an instance of the text input
        super(io_type, options, anchor);
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
        this.io?.insertBefore(this.textarea, this.output!);
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
    //This is autility function that could be used to control the rendered elements at any point.
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
