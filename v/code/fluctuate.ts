//
import { mutall_error } from '../../../schema/v/code/schema.js';
//
//Cascaded Style Sheet selector as the basis of an element's dna.
type css = string;

//The dna of a family modelled as a css structure
type dna = { elder?: css; siblings?: css };

//The fluctuate class supports the expansion and collapsing of input page
//sections to hide and show details as the user requires them. It is designed
//to give users a better data entry experienc than the alternative practice,
//This class is not a view derivative, but it has one that is useful
//for that purpose via delegation.
export class fluctuate {
    //
    //Update the display of a form after a button has been clicked on. Ref is the
    //radio button.
    public static onclick(ref: HTMLInputElement): void {
        //
        //Get the data-field, i.e., the element that envelops the ref element
        //It is referred to as the mother
        const mother: HTMLElement | null = ref.closest('*[data-field]');
        //
        //If the mother field is not found then this is a badly designed form
        //and stop to inform the user
        if (!mother)
            throw new mutall_error(
                'No data-field closest to the current reference element found',
                ref
            );
        //
        //Now perform the fluctuation
        fluctuate.execute(mother);
    }

    //To summarise a field, see the example below, is to hide the elements
    //classified 'SIBLING' and to make visibible those marked 'ELDER', in the
    //context using radio buttons to make choices. The field must be named
    //the same as the radio button
    /*
    <div data-field=$dfname  class="MOTHER">

        <fieldset>
            <label class="SIBLING"> 
                Some label:<input type="radio" name=$dfname>
            </label>
            other tags
        <fieldset>

        <fieldset>
            <label class="SIBLING"> 
                Some label:<input type="radio" name=$dfname checked>
            </label>
            other tags
        <fieldset>
        ...
    </div>
    */
    public static execute(mother: HTMLElement): void {
        //
        //Get the (mother) field name. It is used for formulating the dnas for
        //both the elder and its siblings
        const dfname: string | undefined = mother.dataset.field;
        //
        //Fluctuation will not be effected if the (mother) field is not named.
        if (dfname === undefined)
            throw new mutall_error(
                'An undentified (mother) field (using data-field attribute) cannot be "collapsed"',
                mother
            );
        //
        //Get the dna shared by all children (of the mother field), a.k.a., siblings,
        //that need to be fluctuated.
        const family_dna: string = `input[type="radio"][name="${dfname}"]`;
        //
        //Combine the dnas of all the family members. N.B. the dna of the
        //the elder is extends that of the family
        const dna: dna = { elder: family_dna + ':checked', siblings: family_dna };
        //
        //Separate the elder child from its siblings (via dna analysis)
        const { elder, siblings } = fluctuate.separate_children(mother, dna);
        //
        //If the elder is valid expand her children
        if (elder) fluctuate.summarise_child(elder, family_dna, false);
        //
        //For each sibbling, hide her children
        siblings.forEach((sibling) => fluctuate.summarise_child(sibling, family_dna, true));
    }

    //To fluctuate a child, first consider it as a mother, where the elder
    //child has the family dna; the otheres dont.
    /*
        <fieldset class "MOTHER">
            <label class="ELDER"> 
                Some label:<input type="radio" name=$dfname>
            </label>
            <p class="SIBBLING">hjbhbhjbhjbhbh</p>
            <input class="SIBLING" type="text">
            <div class="SIBLING">...</div>
        <fieldset>
    */
    public static summarise_child(mother: HTMLElement, family_dna: css, hide: boolean): void {
        //
        //The dna of the elder child is that of the familiy; there is nothing
        //special about the children
        const dna: dna = { elder: family_dna };
        //
        //Separate elder from siblings, given that the child is now the mother
        const { elder, siblings } = fluctuate.separate_children(mother, dna);
        //
        //Show the elder child if valid
        if (elder) elder.hidden = false;
        //
        //Show or hide the siblings, depending on the request
        siblings.forEach((sibling) => (sibling.hidden = hide));
    }
    //
    //Separate the elder child from the siblings
    private static separate_children(
        mother: HTMLElement,
        dna: dna
    ): {
        elder: HTMLElement | undefined;
        siblings: Array<HTMLElement>;
    } {
        //Get all the children of the mother
        const children = Array.from(mother.children) as Array<HTMLElement>;
        //
        //Get the elder child, whether defined or not
        const elder: HTMLElement | undefined = fluctuate.get_elder(mother, children, dna);
        //
        //Get all the sibblings who have the same dna the elder included
        const all_siblings: Array<HTMLElement> = fluctuate.get_siblings(mother, children, dna);
        //
        //The desired result should ensure that the elder is not part of the
        //siblings
        const siblings = all_siblings.filter((child) => child !== elder);
        //
        //Return the result
        return { elder, siblings };
    }
    //
    //Get the elder child from the given children
    private static get_elder(
        mother: Element,
        children: Array<HTMLElement>,
        dna: dna
    ): HTMLElement | undefined {
        //
        //Get the elder's  dna (css)
        const css: css | undefined = dna.elder;
        //
        //An elder is undefined if its corresponding css is also undefined
        if (!css) return undefined;
        //
        //Get all the organs, i.e., input element,  identified by the elder css
        const organs: Array<HTMLElement> = Array.from(mother.querySelectorAll(css));
        //
        //Only one elder or none is expected
        const len = organs.length;
        //
        //here is no elder. Return as such
        if (len === 0) return undefined;
        //
        //There cannot be multiple elders
        if (len > 1) throw new mutall_error(`This css '${css}' produces '${len}' elders`, organs);
        //
        //Get the only organ that represents the elder
        const organ: Element = organs[0];
        //
        //An elder is a child that contains this organ. it must be one and only one.
        //
        //Get the children that have the organ
        const elders: Array<HTMLElement> = children.filter((child) => child.contains(organ));
        //
        //There must be one.
        if (elders.length == 0)
            throw new mutall_error(
                `Invalid form. No child qualifies to be an elder defined by css '${css}'`
            );
        //
        //It can only be one
        if (elders.length > 1)
            throw new mutall_error(
                `Invalid form. Found ${elders.length} elders for css '${css}'`,
                elders
            );
        //
        //Retuurn the on;y elder
        return elders[0];
    }
    //
    //Get the siblings of an elder
    private static get_siblings(
        mother: Element,
        children: Array<HTMLElement>,
        dna: dna
    ): Array<HTMLElement> {
        //
        //The form is invalid if both the elder and siblings' dnas are missing
        if (!dna.elder && !dna.siblings)
            throw new mutall_error(
                `Invalid form. At least the elder or sibling (css) dna must be availale`
            );
        //
        //Get the dna of the siblings
        const css: css | undefined = dna.siblings;
        //
        //If the siblings' css does not exist then the siblings are all the
        //mother's chilren
        if (!css) return children;
        //
        //...otherwise isolate th siblings from the children
        //
        //Get all the organs identified by the css
        const organs: Array<HTMLElement> = Array.from(mother.querySelectorAll(css));
        //
        //A sibling is a child that contains any of these organs.
        const siblings: Array<HTMLElement> = children.filter((child) =>
            fluctuate.contains(child, organs)
        );
        //
        //Return the siblings
        return siblings;
    }
    //
    //Tests if a child contains one and only one organ
    private static contains(child: Element, organs: Array<HTMLElement>): boolean {
        //
        //Select all organs of the child
        const child_organs: Array<HTMLElement> = organs.filter((organ) => child.contains(organ));
        //
        //Containement is determined by the number of organs
        const count: number = child_organs.length;
        //
        //There is no containment
        if (count === 0) return false;
        //
        //This is valid containment
        if (count === 1) return true;
        //
        //The containment is not valid if a child has more than 1 organ
        throw new mutall_error(`Invalid form. A child contains ${count} organs`, child);
    }
}
