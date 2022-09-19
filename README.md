# Prog. Distribuída - Trabalho 1

## Integrantes

- Lucas G. Cardoso
- Mathias F. Kauffmann
- Vinicius Bazanella

## Instalação e configuração

1. Clonar este projeto;
1. Instalar o [node](https://nodejs.org/en/download/), caso ainda não o tenha;
1. Na pasta raiz do projeto, rodar `npm install`;

## Execução

1. Subir o server: `npm run server`;
1. Subir os super peers:
    1. `npm run sp0`
    1. `npm run sp1`
    1. `npm run sp2`
    1. `npm run sp3`
1. Subir quantos peers quiser com o comando `npm run peer <addr> <port>`

## Comandos do Peer

### `con`

Envia uma mensagem ao IndexServer, que por sua vez responde com o endereço IP e porta de um dos super peers.

### `reg <folder_path>`

Registra recursos locais e envia seus hashes para o seu super peer.

Para facilitar, existe neste repositório uma pasta `resources` que contém subpastas com alguns arquivos dentro de cada uma delas. Assim cada peer pode registrar os arquivos que estão em uma das pastas.

### `s <file_name>`

Pesquisa por arquivos com um determinado nome na rede, para que seja possível baixá-lo.

## Downloads

Os arquivos baixados na rede P2P serão escritos em uma pasta única do peer, dentro da pasta `downloads` na raiz deste repositório.