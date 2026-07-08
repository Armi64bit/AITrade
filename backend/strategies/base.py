class BaseStrategy:
    name: str

    def compute(self, df, params: dict):
        raise NotImplementedError

    def default_params(self) -> dict:
        raise NotImplementedError
