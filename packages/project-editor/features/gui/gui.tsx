import React from "react";
import { observable, action } from "mobx";
import { observer } from "mobx-react";
//const LZ4 = require("lz4");

import { guid } from "eez-studio-shared/guid";
import {
    ClassInfo,
    registerClass,
    EezObject,
    EezArrayObject,
    PropertyType,
    asArray,
    getProperty,
    NavigationComponent
} from "project-editor/core/object";
import * as output from "project-editor/core/output";

import { ProjectStore } from "project-editor/core/store";
import { registerFeatureImplementation } from "project-editor/core/extensions";

import { MenuNavigation } from "project-editor/components/MenuNavigation";

import { Page } from "project-editor/features/gui/page";
import { Style } from "project-editor/features/gui/style";
import { Font } from "project-editor/features/gui/font";
import { Bitmap } from "project-editor/features/gui/bitmap";
import { Theme, Color } from "project-editor/features/gui/theme";

import { build } from "project-editor/features/gui/build";
import { metrics } from "project-editor/features/gui/metrics";

////////////////////////////////////////////////////////////////////////////////

@observer
export class GuiNavigation extends NavigationComponent {
    render() {
        return (
            <MenuNavigation
                id={this.props.id}
                navigationObject={getProperty(ProjectStore.project, "gui")}
            />
        );
    }
}

////////////////////////////////////////////////////////////////////////////////

export class Gui extends EezObject {
    @observable
    pages: EezArrayObject<Page>;

    @observable
    styles: EezArrayObject<Style>;

    @observable
    fonts: EezArrayObject<Font>;

    @observable
    bitmaps: EezArrayObject<Bitmap>;

    @observable
    colors: EezArrayObject<Color>;

    @observable
    themes: EezArrayObject<Theme>;

    static classInfo: ClassInfo = {
        label: () => "GUI",
        properties: [
            {
                name: "pages",
                displayName: "Pages (Layouts)",
                type: PropertyType.Array,
                typeClass: Page,
                hideInPropertyGrid: true
            },
            {
                name: "styles",
                type: PropertyType.Array,
                typeClass: Style,
                hideInPropertyGrid: true
            },
            {
                name: "fonts",
                type: PropertyType.Array,
                typeClass: Font,
                hideInPropertyGrid: true,
                check: (object: EezObject) => {
                    let messages: output.Message[] = [];

                    if (asArray(object).length > 255) {
                        messages.push(
                            new output.Message(
                                output.Type.ERROR,
                                "Max. 255 fonts are supported",
                                object
                            )
                        );
                    }

                    return messages;
                }
            },
            {
                name: "bitmaps",
                type: PropertyType.Array,
                typeClass: Bitmap,
                hideInPropertyGrid: true,
                check: (object: EezObject) => {
                    let messages: output.Message[] = [];

                    if (asArray(object).length > 255) {
                        messages.push(
                            new output.Message(
                                output.Type.ERROR,
                                "Max. 255 bitmaps are supported",
                                object
                            )
                        );
                    }

                    if (!findStyle("default")) {
                        messages.push(
                            new output.Message(
                                output.Type.ERROR,
                                "'Default' style is missing.",
                                object
                            )
                        );
                    }

                    return messages;
                }
            },
            {
                name: "colors",
                type: PropertyType.Array,
                typeClass: Color,
                hideInPropertyGrid: true,
                partOfNavigation: false
            },
            {
                name: "themes",
                type: PropertyType.Array,
                typeClass: Theme,
                hideInPropertyGrid: true,
                partOfNavigation: false
            }
        ],
        beforeLoadHook: (object: Gui, jsObject: any) => {
            if (jsObject.colors) {
                for (const color of jsObject.colors) {
                    color.id = guid();
                }
            }
            if (jsObject.themes) {
                for (const theme of jsObject.themes) {
                    theme.id = guid();
                    for (let i = 0; i < theme.colors.length; i++) {
                        object.setThemeColor(theme.id, jsObject.colors[i].id, theme.colors[i]);
                    }
                    delete theme.colors;
                }
            }
        },
        navigationComponent: GuiNavigation,
        navigationComponentId: "gui",
        defaultNavigationKey: "pages",
        icon: "filter"
    };

    @observable themeColors = new Map<string, string>();

    getThemeColor(themeId: string, colorId: string) {
        return this.themeColors.get(themeId + colorId) || "#000000";
    }

    @action
    setThemeColor(themeId: string, colorId: string, color: string) {
        this.themeColors.set(themeId + colorId, color);
    }
}

registerClass(Gui);

////////////////////////////////////////////////////////////////////////////////

registerFeatureImplementation("gui", {
    projectFeature: {
        mandatory: false,
        key: "gui",
        type: PropertyType.Object,
        typeClass: Gui,
        create: () => {
            return {
                pages: [],
                styles: [],
                fonts: [],
                bitmaps: []
            };
        },
        build: build,
        metrics: metrics,
        toJsHook: (jsObject: {
            gui: {
                colors: {
                    _array: {
                        id: string;
                    }[];
                };
                themes: {
                    _array: {
                        id: string;
                        colors: string[];
                    }[];
                };
                themeColors: any;
                fonts: {
                    _array: {
                        glyphs: {
                            _array: {
                                glyphBitmap?: {
                                    pixelArray: number[];
                                    pixelArrayCompressed: number[];
                                };
                            }[];
                        };
                    }[];
                };
            };
        }) => {
            const gui = getProperty(ProjectStore.project, "gui") as Gui;

            if (gui) {
                //
                jsObject.gui.colors._array.forEach((color: any) => delete color.id);

                jsObject.gui.themes._array.forEach((theme: any, i: number) => {
                    delete theme.id;
                    theme.colors = gui.themes._array[i].colors;
                });

                delete jsObject.gui.themeColors;

                ///

                // const fontsArray = jsObject.gui.fonts._array;
                // for (let fontIndex = 0; fontIndex < fontsArray.length; fontIndex++) {
                //     const glyphsArray = fontsArray[fontIndex].glyphs._array;
                //     for (let glyphIndex = 0; glyphIndex < glyphsArray.length; glyphIndex++) {
                //         const glyph = glyphsArray[glyphIndex];
                //         if (glyph.glyphBitmap) {
                //             var inputBuffer = Buffer.from(glyph.glyphBitmap.pixelArray);

                //             var outputBuffer = Buffer.alloc(LZ4.encodeBound(inputBuffer.length));
                //             var compressedSize = LZ4.encodeBlock(inputBuffer, outputBuffer);

                //             delete glyph.glyphBitmap.pixelArray;
                //             glyph.glyphBitmap.pixelArrayCompressed = [
                //                 ...outputBuffer.slice(0, compressedSize)
                //             ];
                //         }
                //     }
                // }
            }
        }
    }
});

////////////////////////////////////////////////////////////////////////////////

export function getGui() {
    return ProjectStore.project && (getProperty(ProjectStore.project, "gui") as Gui);
}

export function getPages() {
    let gui = getGui();
    return (gui && gui.pages) || [];
}

export function findPage(pageName: string) {
    let pages = getPages();
    for (const page of pages._array) {
        if (page.name == pageName) {
            return page;
        }
    }
    return undefined;
}

export function findStyle(styleName: string | undefined) {
    let gui = getGui();
    let styles = (gui && gui.styles._array) || [];
    for (const style of styles) {
        if (style.name == styleName) {
            return style;
        }
    }
    return undefined;
}

export function findFont(fontName: any) {
    let gui = getGui();
    let fonts = (gui && gui.fonts) || [];
    for (const font of fonts._array) {
        if (font.name == fontName) {
            return font;
        }
    }
    return undefined;
}

export function findBitmap(bitmapName: any) {
    let gui = getGui();
    let bitmaps = (gui && gui.bitmaps) || [];
    for (const bitmap of bitmaps._array) {
        if (bitmap.name == bitmapName) {
            return bitmap;
        }
    }
    return undefined;
}

// import { runInAction } from "mobx";
// import {
//     EezValueObject,
//     isArray,
//     getObjectPropertyAsObject,
//     objectToString
// } from "project-editor/core/object";
// import { loadObject } from "project-editor/core/serialization";
// import { Widget } from "project-editor/features/gui/widget";
// import { DocumentStore, OutputSectionsStore } from "project-editor/core/store";
// import { Section, Type } from "project-editor/core/output";

// (window as any).trtMrt = function() {
//     type VisitResult = EezValueObject | null;

//     function* visit(parentObject: EezObject): IterableIterator<VisitResult> {
//         if (isArray(parentObject)) {
//             let arrayOfObjects = asArray(parentObject);
//             for (let i = 0; i < arrayOfObjects.length; i++) {
//                 yield* visit(arrayOfObjects[i]);
//             }
//         } else {
//             for (const propertyInfo of parentObject._classInfo.properties) {
//                 if (!propertyInfo.skipSearch) {
//                     let value = getProperty(parentObject, propertyInfo.name);
//                     if (value) {
//                         if (
//                             propertyInfo.type === PropertyType.Object ||
//                             propertyInfo.type === PropertyType.Array
//                         ) {
//                             yield* visit(value);
//                         } else {
//                             yield getObjectPropertyAsObject(parentObject, propertyInfo);
//                         }
//                     }
//                 }
//             }
//         }
//     }

//     let gui = getGui();

//     let v = visit(gui);

//     OutputSectionsStore.clear(Section.SEARCH);

//     const ENCODER_STYLES = [
//         "encoder_cursor_S_disabled",
//         "encoder_cursor_S_enabled",
//         "encoder_cursor_S_left_enabled",
//         "encoder_cursor_M_left_enabled",
//         "encoder_cursor_M_left_bottom_enabled",
//         "encoder_cursor_M_right_enabled",
//         "encoder_cursor_L_right_enabled"
//     ];

//     while (true) {
//         let visitResult = v.next();
//         if (visitResult.done) {
//             break;
//         }

//         if (visitResult.value && visitResult.value.propertyInfo.name === "inheritFrom") {
//             if (
//                 visitResult.value._parent instanceof Style &&
//                 visitResult.value._parent._parent &&
//                 visitResult.value._parent._parent instanceof Widget
//             ) {
//                 const style = visitResult.value._parent;
//                 const widget = visitResult.value._parent._parent;
//                 const parentWidget = visitResult.value._parent._parent._parent!._parent as Widget;
//                 if (widget.style === style && visitResult.value.value === "encoder_cursor") {
//                     if (
//                         (style.fontName === "Oswald14" ||
//                             style.fontName === "Oswald38" ||
//                             style.fontName === "Oswald20") &&
//                         /* alignHorizontal */
//                         (style.alignVertical === undefined ||
//                             style.alignVertical == "center" ||
//                             style.alignVertical == "bottom") &&
//                         (style.color === "text_regular" || style.color === "text_enabled") &&
//                         (style.backgroundColor === "text_enable_background" ||
//                             style.backgroundColor === "Background" ||
//                             style.backgroundColor === "status_warning") &&
//                         style.borderSize === undefined &&
//                         style.borderRadius === undefined &&
//                         style.borderColor === undefined &&
//                         (style.padding === undefined || style.padding.toString() === "0") &&
//                         style.margin === undefined &&
//                         style.opacity === undefined &&
//                         style.blink === undefined
//                     ) {
//                         if (widget.action === "edit" || parentWidget.action === "edit") {
//                             if (style.color === "text_regular") {
//                                 OutputSectionsStore.write(
//                                     Section.SEARCH,
//                                     Type.ERROR,
//                                     objectToString(visitResult.value),
//                                     visitResult.value
//                                 );
//                             }
//                         } else {
//                             if (style.color === "text_enabled") {
//                                 OutputSectionsStore.write(
//                                     Section.SEARCH,
//                                     Type.ERROR,
//                                     objectToString(visitResult.value),
//                                     visitResult.value
//                                 );
//                             }
//                         }

//                         const encoderStyle = ENCODER_STYLES.find(encoderStyleStr => {
//                             const encoderStyle = findStyle(encoderStyleStr);
//                             return encoderStyle && encoderStyle.compareTo(style);
//                         });

//                         if (!encoderStyle) {
//                             console.log(style);
//                             OutputSectionsStore.write(
//                                 Section.SEARCH,
//                                 Type.ERROR,
//                                 objectToString(visitResult.value),
//                                 visitResult.value
//                             );
//                         } else {
//                             runInAction(() => {
//                                 widget.style = loadObject(
//                                     widget,
//                                     {
//                                         inheritFrom: encoderStyle
//                                     },
//                                     Style,
//                                     "style"
//                                 ) as Style;
//                                 DocumentStore.setModified(true);
//                             });
//                         }
//                     } else {
//                         OutputSectionsStore.write(
//                             Section.SEARCH,
//                             Type.ERROR,
//                             objectToString(visitResult.value),
//                             visitResult.value
//                         );
//                     }
//                 } else if (
//                     (widget as any).focusStyle === style &&
//                     visitResult.value.value === "encoder_cursor"
//                 ) {
//                     if (
//                         !widget.style.inheritFrom ||
//                         ENCODER_STYLES.indexOf(widget.style.inheritFrom) === -1
//                     ) {
//                         OutputSectionsStore.write(
//                             Section.SEARCH,
//                             Type.ERROR,
//                             objectToString(visitResult.value),
//                             visitResult.value
//                         );
//                     } else {
//                         runInAction(() => {
//                             (widget as any).focusStyle = loadObject(
//                                 widget,
//                                 {
//                                     inheritFrom: widget.style.inheritFrom + "_focused"
//                                 },
//                                 Style,
//                                 "focusStyle"
//                             ) as Style;
//                             DocumentStore.setModified(true);
//                         });
//                     }
//                 }
//             }
//         }
//     }
// };
