class BaseStrategy:
    name: str

    def compute(self, df, params: dict):
        raise NotImplementedError

    def default_params(self) -> dict:
        raise NotImplementedError

    def update_params(self, params: dict):
        """Update strategy parameters from optimizer"""
        pass
