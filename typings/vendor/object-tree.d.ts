declare module XML {
    export interface ObjectTree {
        xmlDecl: string;
        attr_prefix: string;
        overrideMimeType: string;

        new (): ObjectTree;
        parseXML(xml: string): any;
        parseHTTP(url: string, options: any, callback: Function): any;
        parseDOM(root: Node): any;
        parseElement(elem: Element): any;
        writeXML(tree: any): string;
        hash_to_xml(name: string, tree: any): string;
        array_to_xml(name: string, array: any[]): string;
        scalar_to_xml(name: string, text: string): string;
        xml_escape(text: string): string;
    }
}

declare var ObjectTree: XML.ObjectTree;

declare module "object-tree" {
    export = ObjectTree;
}
