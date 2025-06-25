import logging
LOG = logging.getLogger(__name__)

class UpdateResult:
    def __init__(self, modified_count: int):
        self.modified_count = modified_count

class DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count

class Collection:
    def __init__(self):
        self._docs = []

    def _match(self, doc, filt):
        return all(doc.get(k) == v for k, v in filt.items())

    def insert_one(self, document):
        self._docs.append(document)

    def update_one(self, filt, update, upsert=False):
        for doc in self._docs:
            if self._match(doc, filt):
                doc.update(update.get('$set', {}))
                return UpdateResult(1)
        if upsert:
            new_doc = {**filt, **update.get('$set', {})}
            self._docs.append(new_doc)
        return UpdateResult(0)

    def find_one(self, filt):
        for doc in self._docs:
            if self._match(doc, filt):
                return doc
        return None

    def delete_one(self, filt):
        for i, doc in enumerate(self._docs):
            if self._match(doc, filt):
                del self._docs[i]
                return DeleteResult(1)
        return DeleteResult(0)

    def delete_many(self, filt):
        while True:
            result = self.delete_one(filt)
            if result.deleted_count == 0:
                break
            

    def count_documents(self, filt):
        return len([d for d in self._docs if self._match(d, filt)])

class Database(dict):
    def get_collection(self, name):
        return self.setdefault(name, Collection())
    
    def __getitem__(self, name):
        return self.get_collection(name)

class MongoClient:
    def __init__(self, *args, **kwargs):
        self._dbs = {}

    def get_database(self, name):
        return self.__getitem__(name)

    def __getitem__(self, name):
        return self._dbs.setdefault(name, Database())

# patch decorator stub for compatibility
class patch:
    def __init__(self, *args, **kwargs):
        pass
    def __call__(self, func):
        return func
