import { MongoClient, ObjectId, WithId } from 'mongodb'
import { BaseConnector, Id, MnemonicKeyringModel, UNiDInvalidDataError, UNiDNotImplementedError } from '@getunid/wallet-sdk-base-connector'

export class MongoDBConnector extends BaseConnector<MongoClient> {
    /**
     */
    private readonly DATABASE_NAME: string = 'node_wallet_sdk'

    /**
     */
    private readonly COLLECTION_NAME: string = 'keyring'

    /**
     * @param payload 
     * @returns
     */
    async insert(payload: MnemonicKeyringModel): Promise<Id<MnemonicKeyringModel>> {
        const db     = this.context.client.db(this.DATABASE_NAME)
        const coll   = db.collection<MnemonicKeyringModel>(this.COLLECTION_NAME)
        const model  = await this.encryptModel(payload)
        const result = await coll.insertOne(model)

        return Object.assign<Id<{}>, MnemonicKeyringModel>({ _id: result.insertedId.toHexString() }, payload)
    }

    /**
     * @param _id 
     * @param payload 
     * @returns
     */
    async update(_id: string, payload: MnemonicKeyringModel): Promise<Id<MnemonicKeyringModel>> {
        const db    = this.context.client.db(this.DATABASE_NAME)
        const coll  = db.collection<WithId<MnemonicKeyringModel>>(this.COLLECTION_NAME)
        const model = await this.encryptModel(payload)
        const item  = await coll.findOne({
            _id: new ObjectId(_id),
        })
        if (item === undefined) {
            throw new UNiDInvalidDataError()
        }

        await coll.updateOne({ 
            _id: new ObjectId(_id),
        }, {
            $set: model,
        })

        return Object.assign<Id<{}>, MnemonicKeyringModel>({ _id: _id }, payload)
    }

    /**
     * @param did 
     * @returns
     */
    async findByDid(did: string): Promise<Id<MnemonicKeyringModel> | undefined> {
        const db   = this.context.client.db(this.DATABASE_NAME)
        const coll = db.collection<WithId<MnemonicKeyringModel>>(this.COLLECTION_NAME)
        const item = await coll.findOne({ did: did })

        if (item) {
            const model = await this.decryptModel(item)

            return Object.assign<Id<{}>, MnemonicKeyringModel>({ _id: item._id.toHexString() }, model)
        } else {
            return undefined
        }
    }

    /**
     * @param _ 
     */
    async deleteById(_: MnemonicKeyringModel): Promise<MnemonicKeyringModel> {
        throw new UNiDNotImplementedError()
    }

    /**
     * @param model 
     * @returns
     */
    private async encryptModel(model: MnemonicKeyringModel): Promise<MnemonicKeyringModel> {
        model.sign.private = (await this.context.encrypter(
            Buffer.from(model.sign.private, 'utf-8'), this.context.secret
        )).toString('base64')

        model.update.private = (await this.context.encrypter(
            Buffer.from(model.update.private, 'utf-8'), this.context.secret
        )).toString('base64')

        model.recovery.private = (await this.context.encrypter(
            Buffer.from(model.recovery.private, 'utf-8'), this.context.secret
        )).toString('base64')

        model.encrypt.private = (await this.context.encrypter(
            Buffer.from(model.encrypt.private, 'utf-8'), this.context.secret
        )).toString('base64')

        model.seed = (await this.context.encrypter(
            Buffer.from(model.seed, 'utf-8'), this.context.secret
        )).toString('base64')

        if (model.mnemonic !== undefined && model.mnemonic !== null) {
            model.mnemonic = (await this.context.encrypter(
                Buffer.from(model.mnemonic, 'utf-8'), this.context.secret
            )).toString('base64')
        }

        return model
    }

    /**
     * @param model 
     * @returns
     */
    private async decryptModel(model: WithId<MnemonicKeyringModel>): Promise<WithId<MnemonicKeyringModel>> {
        model.sign.private = (await this.context.decrypter(
            Buffer.from(model.sign.private, 'base64'), this.context.secret
        )).toString('utf-8')

        model.update.private = (await this.context.decrypter(
            Buffer.from(model.update.private, 'base64'), this.context.secret
        )).toString('utf-8')

        model.recovery.private = (await this.context.decrypter(
            Buffer.from(model.recovery.private, 'base64'), this.context.secret
        )).toString('utf-8')

        model.encrypt.private = (await this.context.decrypter(
            Buffer.from(model.encrypt.private, 'base64'), this.context.secret
        )).toString('utf-8')

        model.seed = (await this.context.decrypter(
            Buffer.from(model.seed, 'base64'), this.context.secret
        )).toString('utf-8')

        if (model.mnemonic !== undefined && model.mnemonic !== null) {
            model.mnemonic = (await this.context.decrypter(
                Buffer.from(model.mnemonic, 'base64'), this.context.secret
            )).toString('utf-8')
        }

        return model
    }
}