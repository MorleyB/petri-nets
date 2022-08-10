# PetriNet Design Studio

This mini project is a design studio for modeling and simulating petri nets. The domain consists of tokens, places and transitions with arcs to connect these elements. 

Petri nets are used to describe concurrent event and distributed systems. They provide a mathematical construct that can help to plan workflows or present data on complicated systems.

## Installation
- [NodeJS](https://nodejs.org/en/) (LTS recommended or v16.13.1)
- [MongoDB](https://www.mongodb.com/)
- [Python3](https://realpython.com/installing-python/)
- Webgme CLI `npm install -g webgme-cli`

Notes:
- If nvm is installed on your os, run `nvm use` in the command prompt to set the correct version of Node.
- Verify that mongo is installed by entering `mongo` in your command prompt. If that command is unsuccessful, start mongodb locally by running the `mongod` executable in your mongodb installation (you may need to create a `data` directory or set `--dbpath`).

## Run the App
- `npm i`
- `npm run start`
- Navigate to `http://localhost:8888` to start using petri-nets design studio.


## Modeling
To start modeling, go to the Composition tab in the Visualizer Selector sidebar and then click the root node in Object Browser. Look for the PetriNetFolder in the left sidebar and drag it onto the main screen. From here you can rename the folder to match your use case.

Once the new folder is created, select the folder and look for the down arrow in the top left corner of the icon. Click this icon to enter the composition screen for your workspace. On this screen, drag over a PetriNet icon and select the down arrow in the top corner to begin modeling.

## Features
The design studio provides the ability to simulate events and classify your model. To classify your model, go to the PetriNetViz tab on the left side and then look for the Classify button at the top of the screen. To simulate the model you can either click the black rectangles (indicate fireable transitions) or select the Fire all button at the top of the screen. 