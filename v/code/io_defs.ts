//
//Import all the ios 
import * as ios from "./io_classes.js";

//Define the complete ios
type ios_interface = typeof ios;
//
type io_key = keyof ios_interface;
//
type io_type = f<ios_interface>;