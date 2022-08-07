"""
This is where the implementation of the plugin code goes.
The PetriNetCodeGenerator-class is imported from both run_plugin.py and run_debug.py
"""
import sys
import logging
from webgme_bindings import PluginBase
import json
import operator as op

# Setup a logger
logger = logging.getLogger('PetriNetCodeGenerator')
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)  # By default it logs to stderr..
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)


class PetriNetCodeGenerator(PluginBase):
    def main(self):
        core = self.core
        root_node = self.root_node
        active_node = self.active_node
        META = self.META

        logger.info('=========== LOGS =========== ')
        name = core.get_attribute(active_node, 'name')
        logger.info('ActiveNode at "{0}" has name {1}'.format(core.get_path(active_node), name))

        places, transitions = {}, {}

        nodes = core.load_children(active_node)

        # set keys for collectors
        for node in nodes:
            name = core.get_attribute(node, 'name')
           
            if core.is_instance_of(node, META["Place"]):
                # logger.info('P {0} - get_path {1}'.format(name, core.get_path(node)))
                places[core.get_path(node)] = []
           
            if core.is_instance_of(node, META["Transition"]):
                # logger.info('T {0} - get_path {1}'.format(name, core.get_path(node)))
                transitions[core.get_path(node)] = []

        for node in nodes:
            if core.is_instance_of(node, META["TransitionToPlace"]):
                transitions[core.get_pointer_path(node,'src')].append(core.get_pointer_path(node,'dst'))
            if core.is_instance_of(node, META["PlaceToTransition"]):
                places[core.get_pointer_path(node,'src')].append(core.get_pointer_path(node,'dst'))

        logger.info('p2t {0}'.format(json.dumps(places)))
        logger.info('t2p {0}'.format(json.dumps(transitions)))


        # Classifications
        # Ex. Payloads
        # p2t {"/A/N/9": ["/A/N/Y"], "/A/N/k": ["/A/N/f"], "/A/N/p": ["/A/N/f"], "/A/N/h": []}
        # t2p = {"/A/N/Y": ["/A/N/p", "/A/N/k"], "/A/N/f": ["/A/N/h", "/A/N/9"]}

        self.send_notification('Petri Net classification:\
            \n Workflow: {}\n, FreeChoice: {}\n, Marked: {}\n, StateMachine: {}'.format(\
            self.check_workflow(transitions, places),\
            self.check_free_choice(transitions, places),\
            self.check_marked_graph(transitions, places),\
            self.check_state_machine(transitions, places))
        )


    def occur_condition(self, keys, flat_lst, occur=1):
        # returns list of Booleans that meet occur condition
        all = []

        for k in keys:
            count = op.countOf(flat_lst, k)
            value = True if count == occur else False
            all.append(value)
        return all

    def flatten(self, lst):
        return [item for l in lst for item in l]

    def check_state_machine(self, transitions, places):
        # RULE: every transition has one incoming arc, and one outgoing arc
        check = False
        touts = all([len(v) == 1 for p, v in transitions.items()])

        if not touts:
            return False # exit early

        flat_tins = self.flatten(places.values())
        all_tins = self.occur_condition(transitions.keys(), flat_tins)
        tins = all(all_tins)

        if tins and touts:
            return True

        return check

    def check_marked_graph(self, transitions, places):
        # every place has exactly one out transition and one in transition
        check = False
        pouts = all([len(v) == 1 for p, v in places.items()])

        if not pouts:
            return False # exit early

        flat_pins = self.flatten(transitions.values())
        all_pins = self.occur_condition(places.keys(), flat_pins)
        pins = all(all_pins)

        if pins and pouts:
            return True

        return check

    def check_free_choice(self, transitions, places):
        # Rule: each transition has its own unique set if ​inplaces
        check = False
        pouts = all([len(v) == 1 for p, v in places.items()])

        if not pouts:
            return False # exit early if more than one arch from a place

        # must be unique
        flat_pouts = self.flatten(places.values())
        if (len(set(flat_pouts)) == len(flat_pouts)):
            check = True

        return check

    def check_workflow(self, transitions, places):
        # Rule: one place has no arcs from transitions, one place has no arcs from p2t
        check = False
        start = False
        end = False

        # place exists w/1 p2t arch and not in transitions
        # place exist w/0 p2t arch
        flat_pouts = self.flatten(transitions.values())

        for p, v in places.items():
            if len(v) == 0:
                end = True
                continue

            if p not in flat_pouts:
                start = True

        if start and end:
            check = True
            
        return check


