type io_type ={
    discriminant:'input',
    //
    //The type of input element
    type:'date'|'text'|'number',
    //
    //The Physical length and number of characters a text input could allow
    length?: number,
    //
    //The initial value
    init_value?:basic_value,
}|{
    discriminant:'textarea',
    //
    //The width of the text area for typing
    width:number,
    //
    //The Physical length and number of characters a text input could allow
    length?: number,
    //
    init_value?:basic_value,
            
}

