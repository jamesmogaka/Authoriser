import {
    basic_value,
    mutall_error,
    view,
    view_options,
} from '../../../schema/v/code/schema';
import {io, io_options, input_type} from "./io_classes.js";
//
//Re-export the io, so that users dont have to import io_classes.js 
export {io};
//
//Import all the classes as a module
import * as io_module from "./io_classes.js";
//
//Derive the io classes from the module
export type io_classes = typeof io_module;
//
//There will be as many keys as there are io classes in the module
export type io_key = keyof io_classes;

// Define `io_type` as a union of IO interfaces, where each interface represents 
// an IO class. Each interface includes a type discriminant key that matches the 
// class name. It also contains parameters corresponding to the class constructor, 
// excluding the first three: `anchor`, `option`, and `input_values`.
type io_type = get_io_types<io_classes>;
//
//Derive the io types from io classes, Note how the constraint helps to check the
//input
type get_io_types<x extends {[key:string]:any}> =
    //
    //If x is an object...
    x extends {[K in keyof x]:x[K]}
    //
    //..then the get the io types as an object, then flatten the object to get
    // the union of types 
    ? flatten<{[K in keyof x]:get_io_type<Extract<K,string>, x[K]>}>
    //
    //..otherwise return never
    : never;
//
// Get a single io type, given the class name key and the class itself
type get_io_type<K extends string, C extends new(...args:any)=>any> =
    //
    //Compile the desired io type, comprising of the discriminant and a clean
    // list of the class constructor parameters
    {type:K, parameters:clean<ConstructorParameters<C>>};
//
//To flatten an object is to express its key values as a union
type flatten<x extends {[k:string]:any}> = x[keyof x];
//
//Remove noisey keys, such as anchor, option and initial values; They are the first 3 
// of the constructor parameters, by design. Note that optin 2 is optional
type clean<x extends [...p:any]> = x extends [x[0], x[1], x[2]?, ...p:infer P]
    ? P
    :never;
/*
    //
    //The structure of a simple io element
    <label data-io_key= ${io_type.type} data-id=${id}>
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
//Source of the io:non-existing html specification or existing(like case of moses)
type source = {type:io_type, options:io_options}|Element;
//
//To house the static procedures and properties of the io
export abstract class io_parent extends view {
    //
    constructor(parent?: view | undefined, options?: view_options | undefined){
        super(parent, options)
    }
    //
    //A factory method to create a named io from a given source -- a (proxy) html 
    // element or iotype. Try to collect the relevant information that will be 
    // used to create io then create the io and ensure that we pass the relevant 
    // html elements to the created io
    parse(source: source): [name:string, io] {
        //
        //Prepare to derive the io type and options
        let io_type:io_type; let options:io_options; let proxy:Element;
        //
        //The io specs come from an existing html....
        if (source instanceof Element) {
            //
            //Get the io type and use it to get specification of the desired io
            io_type = this.get_io_type(source);
            //
            //Collect the options of the io
            options = this.collect_io_options(source);
            //
            proxy = source;
        }
        //
        //The io specification is direct
        else{
            options = source.options;
            io_type = source.type;
            proxy = this.create_proxy_element();
        }
        //
        //Use the iotype and options collected above to create the io
        return this.create_io(io_type, options, proxy);
    }

    //Collect the io options around tge given elemenet
    abstract collect_io_options(source:Element):io_options;

    
    //Cretae the proxy elemenet
    abstract create_proxy_element():Element;

    //Given an html element return the io type that is associated with it
    get_io_type(element: Element): io_type {
        //
        //Get the data type attribute of the element
        const io_key: string|null = element.getAttribute('data-io_key');
        //
        //If the data type is not specified throw an error
        if (!io_key)
            throw new mutall_error(`The io type is not specified for the given element`);
        //
        //Proceed to compile the io_type specification from the various 
        // attributes of the io element
        const io_type: io_type = this.compile_iotype(<io_key>io_key, element);
        //
        //Return the io type
        return io_type;
    }
    //
    //This is to coordinate the process of collection of the various attributes depending on the io
    //type. We will also compile the attributes into a partial io type structure since we will be collecting
    //the io_type as we go along
    compile_iotype(io_key: io_key, element: Element): io_type {
        //
        //Depending on the indicated data_type on the io element generate the most appropriate query
        //selector to get the data collection element
        switch (io_key) {
            //
            case 'input':return this.get_input_io_type(element);
            case 'textarea':return this.get_textarea_io_type(element);
            //
            //IF We get to this point the type given is not in our various defined io types
            //alert the user
            default:
                throw new mutall_error(
                    `The type ${io_key} is not supported. Check the data-io_key attributes on your form!!`
                );
            /*    
            //
            //In the data-type text accoding to our text definition its an input of type text
            case 'text':
                return this.get_text(element);
            //
            //The int io is an input of type number
            case 'int':
                return this.get_int(element);
            //
            //The date_time could possibly be an input of either date, datetime or time
            case 'date_time':
                return this.get_datetime(element);
            //
            //A choice could either be a select, checkbox or a radio input
            case 'choice':
                return this.get_choice(element);
            */
        }
    }
    //
    //Read the various attributes that are expected in a text io and compose a 
    // io_type of text.
    //A typical input io structure has the folowing constructor parameters:-
    /* 
    {
        type: 'text';
        //
        //The Physical length and number of characters a text input could allow
        length: number;
    };
    */
    get_input_io_type(element: Element): io_type {
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
        //The general input type is text
        const input_type = <input_type>input.type;
        //
        //The nmaximum nuber of characters that the given text input can have
        const length = this.get_maxlength(element);
        //
        //Now compile the complete iotype
        const io_type: io_type = {type:'input', parameters:[input_type, length]};
        //
        //return the  io type
        return io_type;
    }
    //
    get_textarea_io_type(element:Element):{type:'textarea', parameters:[width?:number, length?:number]}{
        //
        //
        //Get the html element that is used for data collection. We alerdy know that we are dealing
        //with simple text cases
        const input: HTMLTextAreaElement | null = element.querySelector('input[type="textarea"]');
        //
        //A text input must be present since the io is a text io
        if (!input)
            throw new mutall_error(
                'You said its a text io and there is no input element present',
                element
            );
        //
        //Get the limit of a a texta text area text
        const length:number = this.get_maxlength(element);    
        //
        return {type:'textarea', parameters:[input.offsetWidth, length]}
    }


    //
    //Get the datalist associated with the given input element if any
    get_datalist(input: HTMLInputElement): Array<basic_value> | undefined {
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
    get_maxlength(element:Element): number {
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
    get_int(element: HTMLElement): io_type {
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
    get_datetime(element: HTMLElement): io_type {
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
    get_choice(element: HTMLElement): io_type {
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
        const type: 'select' | 'checkbox' | 'radio' = this.categorise_choice(elements);
        //
        //Since the choice io is either a single select element or one or more checkbox or radio
        //elements Use a case statement to handle that diversity
        switch (type) {
            //
            //Retrieve the relevant info from the select element
            case 'select':
                return this.get_select(elements);
            //
            //Retrieve the relevant info from the checkbox element
            case 'checkbox':
                return this.get_checkbox(elements);
            //
            //Retrieve the relevant info from the radio element
            case 'radio':
                return this.get_radio(elements);
        }
    }
    //
    //Depending on the collection of elements given categorise the choice io into one of 3 categories
    //1.select - If we find only one select element in the collection(No checkbox or radio button should
    // be found)
    //2.checkbox - If we find one or more checkboxes in the collection and no other radio or select
    //3.radio - If we find one or more radio buttons in the collection and no other checkbox or select
    categorise_choice(collection: Array<HTMLElement>): 'select' | 'checkbox' | 'radio' {
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

    //Retirns a named io
    create_io(io_type:io_type, options:io_options, proxy:Element):[name:string, io]{
        //
        //Destructure the io type to reveal its components
        const {type, parameters} = io_type;
        //
        //Get the anchor
        //
        //get initial value
        //
        //Create specific io, depending on the type
        switch(type){
            case 'input': {
                //
                const io = new io_module.input(anchor, options, init_value,...parameters);
                //
                return [io.name, io];
        }

    }

}
