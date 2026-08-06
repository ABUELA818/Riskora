from pydantic import BaseModel

class CarreraOut(BaseModel):
    id_carrera: int
    nombre: str

    class Config:
        from_attributes = True