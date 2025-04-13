import {
  basic_value,
  mutall_error,
  view,
  view_options,
} from "../../../schema/v/code/schema.js";
import { io, io_options, input_type } from "./io_classes.js";
//
//Re-export the io, so that users dont have to import io_classes.js
export { io };
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
type get_io_types<x extends { [key: string]: any }> =
  //
  //If x is an object...
  x extends { [K in keyof x]: x[K] }
    ? //
      //..then the get the io types as an object, then flatten the object to get
      // the union of types
      flatten<{ [K in keyof x]: get_io_type<Extract<K, string>, x[K]> }>
    : //
      //..otherwise return never
      never;
//
// Get a single io type, given the class name key and the class itself
type get_io_type<K extends string, C extends new (...args: any) => any> =
  //
  //Compile the desired io type, comprising of the discriminant and a clean
  // list of the class constructor parameters
  { type: K; parameters: clean<ConstructorParameters<C>> };
//
//To flatten an object is to express its key values as a union
type flatten<x extends { [k: string]: any }> = x[keyof x];
//
//Remove noisey keys, such as anchor, option and initial values; They are the first 3
// of the constructor parameters, by design. Note that optin 2 is optional
type clean<x extends [...p: any]> = x extends [
  x[0],
  x[1],
  x[2],
  x[3]?,
  ...p: infer P
]
  ? P
  : never;
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
//TODO: Should the name be part of the io_type specification????
//The anchor - how do we specify where the io should be hoocked when we are given specifications???
type source =
  | {
      type: io_type;
      options: io_options;
      name: string;
      init_value: basic_value;
      anchor: io_module.anchor;
    }
  | Element;
//
//To house the static procedures and properties of the io
export class io_parent extends view {
  //
  constructor(parent?: view | undefined, options?: view_options | undefined) {
    super(parent, options);
  }
  //
  //A factory method to create a named io from a given source -- a (proxy) html
  // element or iotype. Try to collect the relevant information that will be
  // used to create io then create the io and ensure that we pass the relevant
  // html elements to the created io
  parse(source: source): [name: string, io] {
    //
    //Prepare to derive the io type and options
    let io_type: io_type;
    let options: io_options;
    let proxy: Element;
    let name: string;
    let init_value: basic_value;
    let anchor: io_module.anchor;
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
      //Get the name
      name = this.get_name(source);
      //
      //Get the initial value if any
      init_value = this.get_value(source);
      //
      //TODO: Should we constraint the source to a html element????
      // Ensure that the source is a html element
      if (!(source instanceof HTMLElement))
        throw new mutall_error("The source must be a html element!!!");
      //
      //The anchor of the io
      anchor = { parent: this, element: source };
      //
      proxy = source;
    }
    //
    //The io specification is direct
    else {
      //
      //Destructure the specification
      options = source.options;
      io_type = source.type;
      proxy = this.create_proxy_element();
      name = source.name;
      init_value = source.init_value;
      anchor = source.anchor;
    }
    //
    //Use the iotype and options collected above to create the io
    return this.create_io(io_type, options, proxy, name, init_value, anchor);
  }
  //
  //Given an io element try to deduce the name to associate with the io
  //TODO: What about the case of the registration form where the sections have radio buttons????
  get_name(element: Element): string {
    //
    //Get any element with a name attribute
    const input: HTMLElement | null = element.querySelector("[name]");
    //
    if (!input)
      throw new mutall_error(
        "No input with 'name' was found on the given element"
      );
    //
    //Read the value of the name attribute
    const name: string | null = input.getAttribute("name");
    //
    //If no name was found alert the user
    if (!name)
      throw new mutall_error(
        "No name was found on the given source element",
        element
      );
    //
    return name;
  }
  //
  //Get the value of the given io. When reading the initial value the io_key will help in determining
  //how we get the value
  get_value(element: Element): basic_value {
    //
    //Get the data type attribute of the element
    const io_key: string | null = element.getAttribute("data-io_key");
    //
    //If the data type is not specified throw an error
    if (!io_key)
      throw new mutall_error(
        `The io type is not specified for the given element`
      );
    //
    //Use the io_key to determine which element will produce the initial value in the given io source
    //TODO:Use the default query selector provided by js since we are to look for the elements
    //within the element
    switch (io_key) {
      //
      case "input":
        return (<HTMLInputElement>element.querySelector("input")).value;
      case "textarea":
        return (<HTMLTextAreaElement>element.querySelector("textarea")).value;
      //
      //If We get to this point the type given is not in our various defined io types
      //alert the user
      default:
        throw new mutall_error(
          `The type ${io_key} is not supported. Check the data-io_key attributes on your form!!`
        );
    }
  }

  //Collect the io options around tge given elemenet
  collect_io_options(source: Element): io_options {
    //
    //Initialize the options
    const options: io_options = {};
    //
    //Collect the user friendly label
    const caption: string | null | undefined =
      source.querySelector("span:not(.error)")?.textContent;
    //
    //If the caption is not null then add it to the options
    if (caption) options.caption = caption;
    //
    //Get the id associated with the io if any is present
    options.id = this.get_id(source);
    //
    //Get the disabled status of the io
    options.disabled = this.get_disabled(source);
    //
    //Get the required status of the io
    options.required = this.get_required(source);
    //
    return options;
  }
  //
  //Get the id of the io if any is present
  get_id(element: Element): string | undefined {
    //
    //Get the id attribute of the element
    const id: string | null = element.getAttribute("data-id");
    //
    //If the id is not specified return undefined
    if (id) return id;
    //
    //Check if the proxy has an id. if present return it
    if (element.id) return element.id;
    //
    //When we get here we are sure that the id was not provided at the proxy level look for the
    //elements that will be used for data collection
    const input: HTMLElement | null = element.querySelector(
      "input, textarea , select"
    );
    //
    //Get the id from the input if present
    return input?.id;
  }
  //
  //Get the disabled status of the io
  get_disabled(element: Element): boolean | undefined {
    //
    //Get the disabled attribute of the element
    const disabled: boolean = element.hasAttribute("data-disabled");
    //
    //If the disabled attribute present return it
    if (disabled) return disabled;
    //
    //Get any element that is used for data collection
    const input: HTMLElement | null = element.querySelector(
      "input, textarea , select"
    );
    //
    //Check and return if the elements are disabled
    return input?.hasAttribute("disabled");
  }
  //
  //Get the required status of the io
  get_required(element: Element): boolean | undefined {
    //
    //Get the required attribute of the element
    const required: boolean = element.hasAttribute("data-required");
    //
    //If the required attribute present return it
    if (required) return required;
    //
    //Get any element that is used for data collection
    const input: HTMLElement | null = element.querySelector(
      "input, textarea , select"
    );
    //
    //Check and return if the elements are required
    return input?.hasAttribute("required");
  }

  //Cretae the proxy elemenet
  create_proxy_element(): Element {
    //
    //For now use a simple label element
    return this.document.createElement("label");
  }

  //Given an html element return the io type that is associated with it
  get_io_type(element: Element): io_type {
    //
    //Get the data type attribute of the element
    const io_key: string | null = element.getAttribute("data-io_key");
    //
    //If the data type is not specified throw an error
    if (!io_key)
      throw new mutall_error(
        `The io type is not specified for the given element`
      );
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
      case "input":
        return this.get_input_io_type(element);
      case "textarea":
        return this.get_textarea_io_type(element);
      //
      //If We get to this point the type given is not in our various defined io types
      //alert the user
      default:
        throw new mutall_error(
          `The type ${io_key} is not supported. Check the data-io_key attributes on your form!!`
        );
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
    const input: HTMLInputElement | null = element.querySelector("input");
    //
    //A text input must be present since the io is a text io
    if (!input)
      throw new mutall_error(
        "You said its a text io and there is no input element present",
        element
      );
    //
    //The general input type is text
    const input_type = <input_type>input.type;
    //
    //The nmaximum nuber of characters that the given text input can have
    const length = this.get_maxlength(input);
    //
    //Now compile the complete iotype
    const io_type: io_type = {
      type: "input",
      parameters: [input_type, length],
    };
    //
    //return the  io type
    return io_type;
  }
  //
  get_textarea_io_type(element: Element): {
    type: "textarea";
    parameters: [width?: number, length?: number];
  } {
    //
    //
    //Get the html element that is used for data collection. We alerdy know that we are dealing
    //with simple text cases
    const input: HTMLTextAreaElement | null = element.querySelector(
      'input[type="textarea"]'
    );
    //
    //A text input must be present since the io is a text io
    if (!input)
      throw new mutall_error(
        "You said its a text io and there is no input element present",
        element
      );
    //
    //Get the limit of a a texta text area text
    const length: number = this.get_maxlength(input);
    //
    return { type: "textarea", parameters: [input.offsetWidth, length] };
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
    const values: Array<basic_value> = options.map(
      (option: HTMLOptionElement) => option.value
    );
    //
    //Return the values
    return values;
  }
  //
  //Get the length of a given text input by reading the size attribute and converting it into an
  //integer
  get_maxlength(element: Element): number {
    //
    //The max length is only applicable when the input is a text or a textarea element
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      )
    )
      throw new mutall_error(
        "The max length attribute is only applicable to text and textarea elements",
        element
      );
    //
    //Get the length attribute of the input
    const length: number | null = element.maxLength;
    //
    //If a length is present return it
    if (!(length === null)) return length;
    //
    //If the length is not present Alert the user of this problem
    throw new mutall_error(
      "The length attribute is not present. Check the console!",
      element
    );
  }
  //Retirns a named io
  create_io(
    io_type: io_type,
    options: io_options,
    proxy: Element,
    name: string,
    init_value: basic_value,
    anchor: io_module.anchor
  ): [name: string, io] {
    //
    //Destructure the io type to reveal its components
    const { type, parameters } = io_type;
    //
    //Ensure that the proxy is a html element
    if (!(proxy instanceof HTMLElement))
      throw new mutall_error("The anchor is not a html element");
    //
    //Create specific io, depending on the type
    switch (type) {
      case "input": {
        //
        const io = new io_module.input(
          name,
          anchor,
          options,
          init_value,
          ...parameters
        );
        //
        return [io.name, io];
      }
      case "textarea": {
        //
        //Create the io given the above arguments
        const io = new io_module.textarea(
          name,
          anchor,
          options,
          init_value,
          ...parameters
        );
      }
      default:
        throw new mutall_error(`The io type ${type} is not supported`);
    }
  }
}
