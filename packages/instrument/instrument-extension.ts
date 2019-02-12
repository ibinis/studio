import { computed, values } from "mobx";

import {
    IExtensionDefinition,
    IExtension,
    IExtensionProperties
} from "eez-studio-shared/extensions/extension";
import { extensions } from "eez-studio-shared/extensions/extensions";
import { isRenderer } from "eez-studio-shared/util-electron";
import { stringCompare } from "eez-studio-shared/string";
import { beginTransaction, commitTransaction } from "eez-studio-shared/store";

import { IDesignerContext } from "eez-studio-designer/designer-interfaces";

import { loadInstrumentExtension } from "instrument/import";
import { instrumentStore, instruments } from "instrument/instrument-object";
import * as AddInstrumentDialogModule from "instrument/add-instrument-dialog";
import * as DeletedInstrumentsDialogModule from "instrument/deleted-instruments-dialog";
import { IInstrumentProperties } from "instrument/export";

import * as ConnectionModule from "instrument/connection/connection";

import { createInstrumentListStore } from "instrument/window/lists/store";

if (!isRenderer()) {
    createInstrumentListStore(null);
}

export interface IInstrumentExtensionProperties extends IExtensionProperties {
    properties: IInstrumentProperties;
}

export const instrumentExtensions = computed(() => {
    return values(extensions)
        .filter(extension => extension.type === "instrument")
        .sort((a, b) => stringCompare(a.displayName || a.name, b.displayName || b.name));
});

function createInstrument(extension: IExtension) {
    return {
        type: "instrument",
        oid: instrumentStore.createObject({
            instrumentExtensionId: extension.id,
            autoConnect: false
        }),
        rect: {
            left: 0,
            top: 0,
            width: 128,
            height: 164
        }
    };
}

const instrumentExtension: IExtensionDefinition = {
    preInstalled: true,

    init() {
        if (!isRenderer()) {
            const {
                setupIpcServer
            } = require("instrument/connection/connection") as typeof ConnectionModule;

            setupIpcServer();

            require("instrument/connection/list-operations");
        }
    },

    destroy() {},

    get toolbarButtons() {
        let buttons = [
            {
                id: "instrument-add",
                label: "Add Instrument",
                title: "Add instrument",
                className: "btn-success",
                onClick: (context: IDesignerContext) => {
                    const {
                        showAddInstrumentDialog
                    } = require("instrument/add-instrument-dialog") as typeof AddInstrumentDialogModule;

                    showAddInstrumentDialog(extension => {
                        beginTransaction("Add instrument");
                        let params = createInstrument(extension);
                        context.document.createObject(params);
                        commitTransaction();
                    });
                }
            }
        ];

        const {
            showDeletedInstrumentsDialog,
            deletedInstruments
        } = require("instrument/deleted-instruments-dialog") as typeof DeletedInstrumentsDialogModule;

        if (deletedInstruments.size > 0) {
            buttons.push({
                id: "show-deleted-instruments",
                label: "Deleted Instruments",
                title: "Show deleted instruments",
                className: "btn-default",
                onClick: (context: IDesignerContext) => {
                    showDeletedInstrumentsDialog();
                }
            });
        }

        return buttons;
    },

    objectTypes: {
        instrument: (id: string) => instruments.get(id)
    },

    loadExtension: loadInstrumentExtension
};

export default instrumentExtension;
