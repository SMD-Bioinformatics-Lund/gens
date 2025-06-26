import logging
import math
import random
import types
from typing import Any
LOG = logging.getLogger(__name__)

class UpdateResult:
    def __init__(self, modified_count: int, matched_count: int = 0):
        self.modified_count = modified_count
        self.matched_count = matched_count

class DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count

class InsertMenyResult:
    def __init__(self, inserted_ids: list[str]):
        self.inserted_ids = inserted_ids

class Collection:
    def __init__(self):
        self._docs: list[dict[str, Any]] = []

    def _match(self, doc, filt):
        return all(doc.get(k) == v for k, v in filt.items())

    def insert_one(self, document: Any):

        if document.get("_id") is None:
            document["_id"] = document.get("_id", f"id-{random.random()}")
        self._docs.append(document)

        return types.SimpleNamespace(inserted_id=id)

    def insert_many(self, documents: list[dict[str, Any]]):
        ids: list[str] = []
        for doc in documents:
            _id = doc.get("_id", f"id-{random.random()}")
            doc["_id"] = _id
            self._docs.append(doc)
            ids.append(_id)
        return InsertMenyResult(inserted_ids=ids)

    def update_one(self, filt, update, upsert=False):
        for doc in self._docs:
            if self._match(doc, filt):
                doc.update(update.get("$set", {}))
                return UpdateResult(modified_count=1, matched_count=1)
        if upsert:
            new_doc = {**filt, **update.get("$set", {})}
            self._docs.append(new_doc)
        return UpdateResult(modified_count=0, matched_count=0)

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
        count = 0
        while True:
            result = self.delete_one(filt)
            if result.deleted_count == 0:
                break
            count += result.deleted_count
        return DeleteResult(count)
            

    # def find(self, filt=None, projection=None):
    #     filt = filt or {}
    #     result = [doc for doc in self._docs if self._match(doc, filt)]

    #     class Cursor(list):
    #         def sort(self_inner, sort_spec):
    #             if isinstance(sort_spec, dict):
    #                 key, direction = next(iter(sort_spec.items()))
    #             else:
    #                 key, direction = sort_spec[0]

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

    def get_database(self, name) -> Database:
        return self.__getitem__(name)

    def __getitem__(self, name):
        return self._dbs.setdefault(name, Database())

# patch decorator stub for compatibility
class patch:
    def __init__(self, *args, **kwargs):
        pass
    def __call__(self, func):
        return func
